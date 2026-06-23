import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, actorFromReq } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS, ALL_PERMISSIONS, PERMISSION_LABELS } from '../permissions';
import { recordAudit, clientIp } from '../utils/audit';

export const rolesRouter = Router();
rolesRouter.use(authenticate);

function publicRole(r: any) {
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(r.permissions);
  } catch {
    permissions = [];
  }
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissions,
    userCount: r._count?.userRoles,
  };
}

// Catalogue des permissions disponibles (pour l'UI d'admin)
rolesRouter.get('/permissions', requirePermission(PERMISSIONS.ROLES_READ), (_req, res) => {
  res.json(ALL_PERMISSIONS.map((p) => ({ key: p, label: PERMISSION_LABELS[p] ?? p })));
});

rolesRouter.get('/', requirePermission(PERMISSIONS.ROLES_READ), async (_req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: { _count: { select: { userRoles: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(roles.map(publicRole));
  } catch (err) {
    next(err);
  }
});

const roleSchema = z.object({
  name: z.string().min(1, 'Nom du role requis.'),
  description: z.string().optional().nullable(),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).default([]),
});

rolesRouter.post('/', requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res, next) => {
  try {
    const data = roleSchema.parse(req.body);
    const exists = await prisma.role.findUnique({ where: { name: data.name } });
    if (exists) return res.status(409).json({ error: 'Un role porte deja ce nom.' });

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        permissions: JSON.stringify(data.permissions),
      },
    });
    await recordAudit({
      action: 'CREATE',
      entity: 'Role',
      entityId: role.id,
      actor: actorFromReq(req),
      newValue: { name: role.name, permissions: data.permissions },
      ipAddress: clientIp(req),
    });
    res.status(201).json(publicRole(role));
  } catch (err) {
    next(err);
  }
});

rolesRouter.put('/:id', requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res, next) => {
  try {
    const data = roleSchema.partial().parse(req.body);
    const before = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Role introuvable.' });

    const updated = await prisma.role.update({
      where: { id: before.id },
      data: {
        name: data.name ?? before.name,
        description: data.description === undefined ? before.description : data.description,
        permissions: data.permissions ? JSON.stringify(data.permissions) : before.permissions,
      },
    });
    await recordAudit({
      action: 'UPDATE',
      entity: 'Role',
      entityId: before.id,
      actor: actorFromReq(req),
      oldValue: { name: before.name, permissions: JSON.parse(before.permissions) },
      newValue: { name: updated.name, permissions: data.permissions },
      ipAddress: clientIp(req),
    });
    res.json(publicRole(updated));
  } catch (err) {
    next(err);
  }
});

rolesRouter.delete('/:id', requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role) return res.status(404).json({ error: 'Role introuvable.' });
    if (role.isSystem) return res.status(400).json({ error: 'Un role systeme ne peut pas etre supprime.' });
    if (role._count.userRoles > 0) {
      return res.status(400).json({ error: 'Role attribue a des utilisateurs : retirez-le d\'abord.' });
    }
    await prisma.role.delete({ where: { id: role.id } });
    await recordAudit({
      action: 'DELETE',
      entity: 'Role',
      entityId: role.id,
      actor: actorFromReq(req),
      oldValue: { name: role.name },
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
