import { Router, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { TenantModel } from './tenant.model.js';
import { UserModel } from './user.model.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { createVerificationToken, hashVerificationToken } from './token.service.js';
import { sendVerificationEmail, sendWelcomeEmail } from './email.service.js';

const router: Router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  companyName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128)
});

const resendSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase())
});

function validationError(res: Response, issues: z.ZodIssue[]) {
  return res.status(422).json({
    success: false,
    error: 'Datos de autenticación inválidos',
    details: issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);

    const existing = await UserModel.findOne({ email: parsed.data.email }).select('+verificationTokenHash +verificationExpiresAt +verificationSentAt');
    if (existing) {
      res.status(202).json({ success: true, data: { message: 'Si el correo puede registrarse, recibirás instrucciones de confirmación.' } });
      return;
    }

    const tenant = await TenantModel.create({ name: parsed.data.companyName });
    const passwordHash = await hashPassword(parsed.data.password);
    const { token, tokenHash } = createVerificationToken();
    const now = new Date();
    const verificationExpiresAt = new Date(now.getTime() + env.EMAIL_VERIFICATION_TTL_MINUTES * 60_000);

    const user = await UserModel.create({
      tenantId: tenant.id,
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      roles: ['admin'],
      verificationTokenHash: tokenHash,
      verificationExpiresAt,
      verificationSentAt: now
    });

    try {
      await sendVerificationEmail({ email: user.email, name: user.name, token });
    } catch (error) {
      console.error('[Verification email error]', error);
      res.status(503).json({ success: false, error: 'La cuenta fue creada, pero no se pudo enviar el correo. Intenta reenviarlo en unos minutos.' });
      return;
    }

    res.status(201).json({ success: true, data: { message: 'Cuenta creada. Revisa tu correo para confirmar el registro.' } });
  } catch (error) {
    next(error);
  }
});

router.get('/verify-email', async (req, res, next) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
      res.status(400).send(verificationPage('Enlace inválido', 'El enlace de confirmación no contiene un token válido.', false));
      return;
    }

    const user = await UserModel.findOne({
      verificationTokenHash: hashVerificationToken(token),
      verificationExpiresAt: { $gt: new Date() },
      emailVerifiedAt: null
    }).select('+verificationTokenHash +verificationExpiresAt');

    if (!user) {
      res.status(400).send(verificationPage('Enlace vencido o utilizado', 'Solicita un nuevo correo de confirmación desde Orbit ERP.', false));
      return;
    }

    user.emailVerifiedAt = new Date();
    user.verificationTokenHash = null;
    user.verificationExpiresAt = null;
    await user.save();

    try {
      await sendWelcomeEmail({ email: user.email, name: user.name, userId: user.id });
    } catch (error) {
      console.error('[Welcome email error]', error);
    }

    res.status(200).send(verificationPage('Correo confirmado', 'Tu cuenta está activa. Ya puedes iniciar sesión en Android o en la página web.', true));
  } catch (error) {
    next(error);
  }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const parsed = resendSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);

    const user = await UserModel.findOne({ email: parsed.data.email, emailVerifiedAt: null })
      .select('+verificationTokenHash +verificationExpiresAt +verificationSentAt');

    if (user) {
      const lastSent = user.verificationSentAt?.getTime() ?? 0;
      if (Date.now() - lastSent >= 60_000) {
        const { token, tokenHash } = createVerificationToken();
        user.verificationTokenHash = tokenHash;
        user.verificationExpiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_MINUTES * 60_000);
        user.verificationSentAt = new Date();
        await user.save();
        await sendVerificationEmail({ email: user.email, name: user.name, token });
      }
    }

    res.json({ success: true, data: { message: 'Si existe una cuenta pendiente, recibirás un nuevo correo de confirmación.' } });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.issues);

    const user = await UserModel.findOne({ email: parsed.data.email, isActive: true }).select('+passwordHash');
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
      return;
    }

    if (!user.emailVerifiedAt) {
      res.status(403).json({ success: false, error: 'Confirma tu correo antes de iniciar sesión.', code: 'EMAIL_NOT_VERIFIED' });
      return;
    }

    const token = jwt.sign(
      { roles: user.roles, tenantId: user.tenantId },
      env.JWT_SECRET,
      { subject: user.id, expiresIn: '8h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, tenantId: user.tenantId, email: user.email, name: user.name, roles: user.roles }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const user = await UserModel.findOne({
      _id: req.user?.id,
      tenantId: req.tenantId,
      isActive: true,
      emailVerifiedAt: { $ne: null }
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'La sesión ya no es válida.' });
      return;
    }

    res.json({
      success: true,
      data: { id: user.id, tenantId: user.tenantId, email: user.email, name: user.name, roles: user.roles }
    });
  } catch (error) {
    next(error);
  }
});

function verificationPage(title: string, message: string, success: boolean) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#050b18;color:#f5f7fb;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center"><main style="max-width:560px;margin:24px;background:#0d1830;border:1px solid #1f3764;border-radius:22px;padding:36px;text-align:center"><div style="font-size:48px">${success ? '✓' : '!'}</div><h1 style="color:${success ? '#4ca6ff' : '#ffb648'}">${title}</h1><p style="color:#aab5ca;line-height:1.6">${message}</p></main></body></html>`;
}

export default router;

