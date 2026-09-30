import { env } from '../../config/env.js';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character] ?? character);
}

async function sendEmail(payload: EmailPayload) {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY no está configurada');
    console.warn(`[Email deshabilitado] ${payload.subject} -> ${payload.to}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': payload.idempotencyKey
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [payload.to],
      reply_to: env.EMAIL_REPLY_TO,
      subject: payload.subject,
      html: payload.html
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rechazó el correo (${response.status}): ${detail}`);
  }
}

export async function sendVerificationEmail(input: { email: string; name: string; token: string }) {
  const confirmationUrl = `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/auth/verify-email?token=${encodeURIComponent(input.token)}`;
  const safeName = escapeHtml(input.name);

  await sendEmail({
    to: input.email,
    subject: 'Confirma tu cuenta de Orbit ERP',
    idempotencyKey: `verify-email/${input.email}/${input.token.slice(0, 16)}`,
    html: `
      <div style="background:#050b18;padding:32px;font-family:Arial,sans-serif;color:#f5f7fb">
        <div style="max-width:560px;margin:auto;background:#0d1830;border:1px solid #1f3764;border-radius:20px;padding:32px">
          <h1 style="margin:0 0 16px;color:#4ca6ff">Confirma tu cuenta</h1>
          <p>Hola ${safeName}, gracias por registrarte en Orbit ERP.</p>
          <p>Confirma tu correo para activar el inicio de sesión. El enlace vence en ${env.EMAIL_VERIFICATION_TTL_MINUTES} minutos.</p>
          <p style="margin:28px 0"><a href="${confirmationUrl}" style="background:#2f80ff;color:white;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:bold">Confirmar mi correo</a></p>
          <p style="font-size:12px;color:#8c9ab5">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        </div>
      </div>`
  });
}

export async function sendWelcomeEmail(input: { email: string; name: string; userId: string }) {
  const safeName = escapeHtml(input.name);
  await sendEmail({
    to: input.email,
    subject: 'Bienvenido a Orbit ERP',
    idempotencyKey: `welcome-user/${input.userId}`,
    html: `
      <div style="background:#050b18;padding:32px;font-family:Arial,sans-serif;color:#f5f7fb">
        <div style="max-width:560px;margin:auto;background:#0d1830;border:1px solid #1f3764;border-radius:20px;padding:32px">
          <h1 style="margin:0 0 16px;color:#4ca6ff">Bienvenido a Orbit ERP</h1>
          <p>Hola ${safeName}, tu correo fue confirmado correctamente.</p>
          <p>Ya puedes iniciar sesión desde la aplicación Android o desde la página web.</p>
        </div>
      </div>`
  });
}

