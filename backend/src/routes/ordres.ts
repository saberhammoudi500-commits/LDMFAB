import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, actorFromReq } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { recordAudit, clientIp } from '../utils/audit';
import {
  ofInputSchema,
  withComputedYield,
  serializeOf,
  WORKFLOW_TRANSITIONS,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from '../services/ofSchema';

export const ordresRouter = Router();
ordresRouter.use(authenticate);

const ofInclude = {
  verifier: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

// Liste avec recherche / filtres / pagination
ordresRouter.get('/', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize ?? '25'), 10) || 25));
    const search = String(req.query.search ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const cndt = String(req.query.cndt ?? '').trim();
    const aql = String(req.query.aql ?? '').trim();

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { codeProduit: { contains: search } },
        { designation: { contains: search } },
        { numeroLot: { contains: search } },
      ];
    }
    if (status) where.workflowStatus = status;
    if (cndt) where.cndt = cndt;
    if (aql) where.aql = aql;

    const [total, rows] = await Promise.all([
      prisma.ordreFabrication.count({ where }),
      prisma.ordreFabrication.findMany({
        where,
        include: ofInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      data: rows.map(serializeOf),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
});

// Detail
ordresRouter.get('/:id', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const of = await prisma.ordreFabrication.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: ofInclude,
    });
    if (!of) return res.status(404).json({ error: 'Ordre de fabrication introuvable.' });
    const signatures = await prisma.electronicSignature.findMany({
      where: { entity: 'OrdreFabrication', entityId: of.id },
      orderBy: { signedAt: 'asc' },
    });
    res.json({ ...serializeOf(of), signatures });
  } catch (err) {
    next(err);
  }
});

// Creation
ordresRouter.post('/', requirePermission(PERMISSIONS.OF_CREATE), async (req, res, next) => {
  try {
    const input = ofInputSchema.parse(req.body);
    const data = withComputedYield(input);
    const of = await prisma.ordreFabrication.create({
      data: { ...data, createdById: req.user!.sub, workflowStatus: 'CREATION' },
      include: ofInclude,
    });
    await recordAudit({
      action: 'CREATE',
      entity: 'OrdreFabrication',
      entityId: of.id,
      actor: actorFromReq(req),
      newValue: { codeProduit: of.codeProduit, numeroLot: of.numeroLot },
      ipAddress: clientIp(req),
    });
    res.status(201).json(serializeOf(of));
  } catch (err) {
    next(err);
  }
});

// Modification (motif obligatoire - 21 CFR Part 11)
const updateSchema = ofInputSchema.partial().extend({ reason: z.string().min(1, 'Motif de modification requis.') });

ordresRouter.put('/:id', requirePermission(PERMISSIONS.OF_UPDATE), async (req, res, next) => {
  try {
    const { reason, ...rest } = updateSchema.parse(req.body);
    const before = await prisma.ordreFabrication.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!before) return res.status(404).json({ error: 'Ordre de fabrication introuvable.' });
    if (before.workflowStatus === 'CLOTURE') {
      return res.status(409).json({ error: 'Un OF cloture ne peut plus etre modifie.' });
    }

    const merged = { ...before, ...rest } as any;
    const data = withComputedYield(merged);

    const updated = await prisma.ordreFabrication.update({
      where: { id: before.id },
      data: { ...rest, rendementTotal: data.rendementTotal },
      include: ofInclude,
    });

    await recordAudit({
      action: 'UPDATE',
      entity: 'OrdreFabrication',
      entityId: before.id,
      reason,
      actor: actorFromReq(req),
      oldValue: before,
      newValue: rest,
      ipAddress: clientIp(req),
    });
    res.json(serializeOf(updated));
  } catch (err) {
    next(err);
  }
});

// Transition de workflow
const transitionSchema = z.object({
  target: z.enum(WORKFLOW_STATUSES),
  reason: z.string().optional(),
});

ordresRouter.post('/:id/transition', requirePermission(PERMISSIONS.OF_UPDATE, PERMISSIONS.OF_VERIFY, PERMISSIONS.OF_VALIDATE), async (req, res, next) => {
  try {
    const { target, reason } = transitionSchema.parse(req.body);
    const of = await prisma.ordreFabrication.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!of) return res.status(404).json({ error: 'Ordre de fabrication introuvable.' });

    const current = of.workflowStatus as WorkflowStatus;
    const allowed = WORKFLOW_TRANSITIONS[current] ?? [];
    if (!allowed.includes(target)) {
      return res.status(409).json({ error: `Transition non autorisee : ${current} -> ${target}.` });
    }

    // Controle des permissions selon la cible
    const perms = req.user!.permissions;
    if (target === 'CLOTURE' && !perms.includes(PERMISSIONS.OF_VALIDATE)) {
      return res.status(403).json({ error: 'Permission de validation/cloture requise.' });
    }
    if ((target === 'VERIFICATION' || target === 'RECTIFICATION') && !perms.includes(PERMISSIONS.OF_VERIFY) && !perms.includes(PERMISSIONS.OF_VALIDATE)) {
      return res.status(403).json({ error: 'Permission de verification requise.' });
    }

    const patch: any = { workflowStatus: target };
    if (target === 'CLOTURE') patch.validiteOF = 'OF Cloture';

    const updated = await prisma.ordreFabrication.update({
      where: { id: of.id },
      data: patch,
      include: ofInclude,
    });

    await recordAudit({
      action: 'UPDATE',
      entity: 'OrdreFabrication',
      entityId: of.id,
      reason: reason ?? `Transition ${current} -> ${target}`,
      actor: actorFromReq(req),
      oldValue: { workflowStatus: current },
      newValue: { workflowStatus: target },
      ipAddress: clientIp(req),
    });
    res.json(serializeOf(updated));
  } catch (err) {
    next(err);
  }
});

// Suppression logique
const deleteSchema = z.object({ reason: z.string().min(1, 'Motif requis.') });

ordresRouter.delete('/:id', requirePermission(PERMISSIONS.OF_DELETE), async (req, res, next) => {
  try {
    const { reason } = deleteSchema.parse(req.body ?? {});
    const of = await prisma.ordreFabrication.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!of) return res.status(404).json({ error: 'Ordre de fabrication introuvable.' });
    await prisma.ordreFabrication.update({ where: { id: of.id }, data: { deletedAt: new Date() } });
    await recordAudit({
      action: 'DELETE',
      entity: 'OrdreFabrication',
      entityId: of.id,
      reason,
      actor: actorFromReq(req),
      oldValue: { codeProduit: of.codeProduit, numeroLot: of.numeroLot },
      ipAddress: clientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
