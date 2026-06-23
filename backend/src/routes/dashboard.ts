import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { WORKFLOW_LABELS, type WorkflowStatus } from '../services/ofSchema';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/', requirePermission(PERMISSIONS.DASHBOARD_READ), async (_req, res, next) => {
  try {
    const baseWhere = { deletedAt: null };

    const [total, parStatut, parAql, ofs, retardValidite] = await Promise.all([
      prisma.ordreFabrication.count({ where: baseWhere }),
      prisma.ordreFabrication.groupBy({ by: ['workflowStatus'], where: baseWhere, _count: true }),
      prisma.ordreFabrication.groupBy({ by: ['aql'], where: baseWhere, _count: true }),
      prisma.ordreFabrication.findMany({
        where: baseWhere,
        select: { rendementTotal: true },
      }),
      prisma.ordreFabrication.count({
        where: { ...baseWhere, finValiditeOF: { lt: new Date() }, workflowStatus: { not: 'CLOTURE' } },
      }),
    ]);

    const rendements = ofs.map((o) => o.rendementTotal).filter((r): r is number => r !== null);
    const rendementMoyen = rendements.length
      ? Math.round((rendements.reduce((a, b) => a + b, 0) / rendements.length) * 100) / 100
      : null;

    const conforme = parAql.find((a) => (a.aql ?? '').toUpperCase() === 'CONFORME')?._count ?? 0;
    const totalAql = parAql.reduce((acc, a) => acc + (typeof a._count === 'number' ? a._count : 0), 0);
    const tauxConformite = totalAql ? Math.round((conforme / totalAql) * 10000) / 100 : null;

    res.json({
      totalOF: total,
      ofClotures: parStatut.find((s) => s.workflowStatus === 'CLOTURE')?._count ?? 0,
      ofEnCours: total - (parStatut.find((s) => s.workflowStatus === 'CLOTURE')?._count ?? 0),
      rendementMoyen,
      tauxConformite,
      retardValidite,
      repartitionStatut: parStatut.map((s) => ({
        statut: s.workflowStatus,
        label: WORKFLOW_LABELS[s.workflowStatus as WorkflowStatus] ?? s.workflowStatus,
        count: typeof s._count === 'number' ? s._count : 0,
      })),
      repartitionAql: parAql.map((a) => ({
        aql: a.aql ?? 'Non renseigne',
        count: typeof a._count === 'number' ? a._count : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});
