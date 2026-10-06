import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { hashPassword } from '../auth/password.service.js';
import { UserModel } from '../auth/user.model.js';

const router: Router = Router();
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const roleSchema = z.enum(['admin', 'sales', 'accounting', 'purchasing', 'projects']);
const createSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().transform((value) => value.toLowerCase()), password: z.string().min(10).max(128), role: roleSchema });
const updateSchema = z.object({ role: roleSchema.optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);

function publicUser(user: { _id: unknown; name: string; email: string; roles: string[]; isActive: boolean; createdAt?: Date }) {
  return { id: String(user._id), name: user.name, email: user.email, roles: user.roles, isActive: user.isActive, createdAt: user.createdAt };
}

router.get('/', requireRoles('admin'), async (req, res, next) => {
  try {
    const users = await UserModel.find({ tenantId: req.tenantId }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: users.map((user) => publicUser(user)) });
  } catch (error) { next(error); }
});

router.post('/', requireRoles('admin'), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Revisa nombre, correo, contraseña y rol.');
    if (await UserModel.exists({ email: parsed.data.email })) throw new AppError(409, 'Ese correo ya está registrado.');
    const user = await UserModel.create({ tenantId: req.tenantId, name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), roles: [parsed.data.role], isActive: true, emailVerifiedAt: new Date() });
    res.status(201).json({ success: true, data: publicUser(user) });
  } catch (error) { next(error); }
});

router.patch('/:id', requireRoles('admin'), async (req, res, next) => {
  try {
    const id = idSchema.safeParse(req.params.id);
    const parsed = updateSchema.safeParse(req.body);
    if (!id.success || !parsed.success) throw new AppError(422, 'Cambio de usuario inválido.');
    if (id.data === req.user?.id && parsed.data.isActive === false) throw new AppError(409, 'No puedes desactivar tu propia cuenta.');
    const update: Record<string, unknown> = {};
    if (parsed.data.role) update.roles = [parsed.data.role];
    if (typeof parsed.data.isActive === 'boolean') update.isActive = parsed.data.isActive;
    const user = await UserModel.findOneAndUpdate({ _id: id.data, tenantId: req.tenantId }, { $set: update }, { new: true }).lean();
    if (!user) throw new AppError(404, 'Usuario no encontrado.');
    res.json({ success: true, data: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;
