import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { verifyPassword } from '../utils/auth';
import { recordAudit, clientIp } from '../utils/audit';

export const signaturesRouter = Router();
signaturesRouter.use(authenticate);

const signSchema = z.object({
  entity: z.literal('OrdreFabrication'),
  entityId: z.string().min(1),
  meaning: z.enum(['AUTHOR', 'REVIEWER', 'APPROVER']),
  reason: z.string().min(1, 'Motif de la signature requis.'),
  password: z.string().min(1, 'Mot de passe requis pour signer.'),
});

/**
 * Signature electronique (21 CFR Part 11) : re-authentification obligatoire
 * (mot de passe) + enregistrement du sens, du motif et de l'horodatage.
 */
signaturesRouter.post('/', requirePermission(PERMISSIONS.OF_SIGN), async (req, res, next) => {
  try {
    const data = signSchema.parse(req.body);

    const user = await prisma.user.findFirst({ where: { id: req.user!.sub, deletedAt: null } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    // Re-authentification
    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) {
      await recordAudit({
        action: 'LOGIN_FAILED',
        entity: 'Signature',
        entityId: data.entityId,
        reason: 'Echec re-authentification signature',
        actor: { id: user.id, label: `${user.matricule} - ${user.firstName} ${user.lastName}` },
        ipAddress: clientIp(req),
      });
      return res.status(401).json({ error: 'Mot de passe incorrect : signature refusee.' });
    }

    const of = await prisma.ordreFabrication.findFirst({ where: { id: data.entityId, deletedAt: null } });
    if (!of) return res.status(404).json({ error: 'Ordre de fabrication introuvable.' });

    const userLabel = `${user.matricule} - ${user.firstName} ${user.lastName}`;
    const signature = await prisma.electronicSignature.create({
      data: {
        userId: user.id,
        userLabel,
        entity: data.entity,
        entityId: data.entityId,
        meaning: data.meaning,
        reason: data.reason,
        ipAddress: clientIp(req),
      },
    });

    await recordAudit({
      action: 'SIGN',
      entity: data.entity,
      entityId: data.entityId,
      reason: `Signature (${data.meaning}) : ${data.reason}`,
      actor: { id: user.id, label: userLabel },
      ipAddress: clientIp(req),
    });

    res.status(201).json(signature);
  } catch (err) {
    next(err);
  }
});

signaturesRouter.get('/:entityId', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const signatures = await prisma.electronicSignature.findMany({
      where: { entity: 'OrdreFabrication', entityId: req.params.entityId },
      orderBy: { signedAt: 'asc' },
    });
    res.json(signatures);
  } catch (err) {
    next(err);
  }
});
