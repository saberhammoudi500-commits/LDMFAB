import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, actorFromReq } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { hashPassword, validatePasswordPolicy } from '../utils/auth';
import { recordAudit, clientIp } from '../utils/audit';

export const usersRouter = Router();
usersRouter.use(authenticate);

function publicUser(u: any) {
  return {
    id: u.id,
    matricule: u.matricule,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    service: u.service,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    lockedUntil: u.lockedUntil,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
    roles: u.roles?.map((r: any) => ({ id: r.role.id, name: r.role.name })) ?? [],
  };
}

// Liste des utilisateurs
usersRouter.get('/', requirePermission(PERMISSIONS.USERS_READ), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(publicUser));
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  matricule: z.string().min(1, 'Matricule requis.'),
  email: z.string().email('Email invalide.'),
  firstName: z.string().min(1, 'Prenom requis.'),
  lastName: z.string().min(1, 'Nom requis.'),
  service: z.string().optional().nullable(),
  password: z.string().min(1, 'Mot de passe requis.'),
  roleIds: z.array(z.string()).default([]),
});

usersRouter.post('/', requirePermission(PERMISSIONS.USERS_CREATE), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const pwdErrors = validatePasswordPolicy(data.password);
    if (pwdErrors.length) return res.status(400).json({ error: 'Mot de passe trop faible.', details: pwdErrors });

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: data.email.toLowerCase() }, { matricule: data.matricule }] },
    });
    if (exists) return res.status(409).json({ error: 'Email ou matricule deja utilise.' });

    const created = await prisma.user.create({
      data: {
        matricule: data.matricule,
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        service: data.service ?? null,
        passwordHash: await hashPassword(data.password),
        mustChangePassword: true,
        roles: {
          create: data.roleIds.map((roleId) => ({ roleId, assignedById: req.user!.sub })),
        },
      },
      include: { roles: { include: { role: true } } },
    });

    await recordAudit({
      action: 'CREATE',
      entity: 'User',
      entityId: created.id,
      actor: actorFromReq(req),
      newValue: { matricule: created.matricule, email: created.email, roles: data.roleIds },
      ipAddress: clientIp(req),
    });

    res.status(201).json(publicUser(created));
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  service: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

usersRouter.put('/:id', requirePermission(PERMISSIONS.USERS_UPDATE), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const before = await prisma.user.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { roles: true },
    });
    if (!before) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const updated = await prisma.$transaction(async (tx) => {
      if (data.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: before.id } });
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId) => ({ userId: before.id, roleId, assignedById: req.user!.sub })),
        });
      }
      return tx.user.update({
        where: { id: before.id },
        data: {
          firstName: data.firstName ?? before.firstName,
          lastName: data.lastName ?? before.lastName,
          service: data.service === undefined ? before.service : data.service,
          isActive: data.isActive ?? before.isActive,
        },
        include: { roles: { include: { role: true } } },
      });
    });

    await recordAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: before.id,
      reason: data.reason ?? null,
      actor: actorFromReq(req),
      oldValue: { firstName: before.firstName, lastName: before.lastName, isActive: before.isActive },
      newValue: { firstName: updated.firstName, lastName: updated.lastName, isActive: updated.isActive, roles: data.roleIds },
      ipAddress: clientIp(req),
    });

    res.json(publicUser(updated));
  } catch (err) {
    next(err);
  }
});

// Reinitialisation du mot de passe par un administrateur
const resetSchema = z.object({ newPassword: z.string().min(1), reason: z.string().optional() });

usersRouter.post('/:id/reset-password', requirePermission(PERMISSIONS.USERS_UPDATE), async (req, res, next) => {
  try {
    const { newPassword, reason } = resetSchema.parse(req.body);
    const errors = validatePasswordPolicy(newPassword);
    if (errors.length) return res.status(400).json({ error: 'Mot de passe trop faible.', details: errors });
    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: new Date(),
      },
    });
    await recordAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      reason: reason ?? 'Reinitialisation du mot de passe (admin)',
      actor: actorFromReq(req),
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Desactivation (soft delete) - pas de suppression physique (ALCOA+)
const deleteSchema = z.object({ reason: z.string().min(1, 'Motif requis.') });

usersRouter.delete('/:id', requirePermission(PERMISSIONS.USERS_DELETE), async (req, res, next) => {
  try {
    const { reason } = deleteSchema.parse(req.body ?? {});
    if (req.params.id === req.user!.sub) {
      return res.status(400).json({ error: 'Vous ne pouvez pas desactiver votre propre compte.' });
    }
    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false, deletedAt: new Date() },
    });
    await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });

    await recordAudit({
      action: 'DELETE',
      entity: 'User',
      entityId: user.id,
      reason,
      actor: actorFromReq(req),
      oldValue: { matricule: user.matricule, email: user.email },
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
