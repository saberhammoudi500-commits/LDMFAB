import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';

export const auditRouter = Router();
auditRouter.use(authenticate);

// Consultation de la piste d'audit (lecture seule, jamais modifiable)
auditRouter.get('/', requirePermission(PERMISSIONS.AUDIT_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize ?? '50'), 10) || 50));
    const entity = String(req.query.entity ?? '').trim();
    const action = String(req.query.action ?? '').trim();
    const entityId = String(req.query.entityId ?? '').trim();

    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (entityId) where.entityId = entityId;

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      data: rows.map((r) => ({
        ...r,
        oldValue: r.oldValue ? safeParse(r.oldValue) : null,
        newValue: r.newValue ? safeParse(r.newValue) : null,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
});

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
