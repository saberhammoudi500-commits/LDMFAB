// Route legacy - redirige vers /api/fabrication/of
// Conservee pour compatibilite avec l'ancienne RealisationsPage
import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';

export const ordresRouter = Router();
ordresRouter.use(authenticate);

ordresRouter.get('/', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize ?? '25'), 10) || 25));
    const search = String(req.query.search ?? '').trim();
    const status = String(req.query.status ?? '').trim();

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { numeroOF: { contains: search, mode: 'insensitive' } },
        { numeroLot: { contains: search, mode: 'insensitive' } },
        { produit: { designation: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.workflowStatus = status;

    const [total, rows] = await Promise.all([
      prisma.ordreFabrication.count({ where }),
      prisma.ordreFabrication.findMany({
        where,
        include: {
          produit: { include: { donneurOrdre: true, formeGalenique: true } },
          phasesRealisation: true,
          conditionnement: true,
          ddl: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      data: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) { next(err); }
});

ordresRouter.get('/:id', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const of = await prisma.ordreFabrication.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        produit: { include: { donneurOrdre: true, formeGalenique: true } },
        phasesRealisation: true,
        conditionnement: true,
        ddl: true,
        signatures: true,
      },
    });
    if (!of) return res.status(404).json({ error: 'Ordre de fabrication introuvable.' });
    res.json(of);
  } catch (err) { next(err); }
});
