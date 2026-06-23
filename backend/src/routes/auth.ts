import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { config } from '../config';
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/auth';
import { buildTokenPayload } from '../services/userToken';
import { authenticate } from '../middleware/auth';
import { recordAudit, clientIp } from '../utils/audit';
import bcrypt from 'bcryptjs';

export const authRouter = Router();

const loginSchema = z.object({
  identifier: z.string().min(1, "Email ou matricule requis."), // email ou matricule
  password: z.string().min(1, 'Mot de passe requis.'),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const ip = clientIp(req);

    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: identifier.toLowerCase() }, { matricule: identifier }],
      },
    });

    // Reponse generique pour ne pas divulguer l'existence du compte
    const invalid = () => res.status(401).json({ error: 'Identifiants invalides.' });

    if (!user) {
      await recordAudit({ action: 'LOGIN_FAILED', entity: 'Session', reason: `Compte inconnu: ${identifier}`, ipAddress: ip });
      return invalid();
    }

    if (!user.isActive) {
      await recordAudit({ action: 'LOGIN_FAILED', entity: 'Session', entityId: user.id, reason: 'Compte inactif', ipAddress: ip });
      return res.status(403).json({ error: 'Compte desactive. Contactez un administrateur.' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        error: `Compte verrouille jusqu'a ${user.lockedUntil.toLocaleTimeString('fr-FR')}.`,
      });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const attempts = user.failedLoginAttempts + 1;
      const lock = attempts >= config.security.maxLoginAttempts;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lock ? 0 : attempts,
          lockedUntil: lock ? new Date(Date.now() + config.security.lockoutMinutes * 60_000) : null,
        },
      });
      await recordAudit({
        action: 'LOGIN_FAILED',
        entity: 'Session',
        entityId: user.id,
        reason: lock ? 'Verrouillage apres tentatives' : `Mot de passe errone (tentative ${attempts})`,
        ipAddress: ip,
      });
      if (lock) {
        return res.status(423).json({
          error: `Trop de tentatives. Compte verrouille ${config.security.lockoutMinutes} minutes.`,
        });
      }
      return invalid();
    }

    // Succes : reinitialise les compteurs
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const payload = await buildTokenPayload(user.id);
    if (!payload) return invalid();

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(user.id);
    const tokenHash = await hashToken(refreshToken);
    const decoded = verifyRefreshToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 8 * 3600_000),
      },
    });
    void decoded;

    await recordAudit({
      action: 'LOGIN',
      entity: 'Session',
      entityId: user.id,
      actor: { id: user.id, label: `${user.matricule} - ${user.firstName} ${user.lastName}` },
      ipAddress: ip,
    });

    res.json({
      accessToken,
      refreshToken,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        matricule: user.matricule,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        roles: payload.roles,
        permissions: payload.permissions,
      },
    });
  } catch (err) {
    next(err);
  }
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    let decoded: { sub: string };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Jeton de rafraichissement invalide.' });
    }

    // Verifie qu'un refresh token actif existe pour cet utilisateur
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: decoded.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    let matched = false;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.tokenHash)) {
        matched = true;
        break;
      }
    }
    if (!matched) return res.status(401).json({ error: 'Session revoquee. Reconnectez-vous.' });

    const payload = await buildTokenPayload(decoded.sub);
    if (!payload) return res.status(401).json({ error: 'Compte indisponible.' });

    res.json({ accessToken: signAccessToken(payload) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user!.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordAudit({
      action: 'LOGOUT',
      entity: 'Session',
      entityId: req.user!.sub,
      actor: { id: req.user!.sub, label: `${req.user!.matricule} - ${req.user!.name}` },
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user!.sub, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({
      id: user.id,
      matricule: user.matricule,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      service: user.service,
      mustChangePassword: user.mustChangePassword,
      roles: user.roles.map((r) => r.role.name),
      permissions: req.user!.permissions,
    });
  } catch (err) {
    next(err);
  }
});

const changePwdSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

authRouter.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePwdSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });

    const { validatePasswordPolicy, hashPassword } = await import('../utils/auth');
    const errors = validatePasswordPolicy(newPassword);
    if (errors.length) return res.status(400).json({ error: 'Mot de passe trop faible.', details: errors });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });
    await recordAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      reason: 'Changement de mot de passe',
      actor: { id: user.id, label: `${user.matricule} - ${user.firstName} ${user.lastName}` },
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
