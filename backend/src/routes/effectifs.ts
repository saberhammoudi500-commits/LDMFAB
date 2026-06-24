import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';

export const effectifsRouter = Router();
effectifsRouter.use(authenticate);

const employeSchema = z.object({
  matricule: z.string().min(1),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  typeContrat: z.enum(['CDI', 'CDD']),
  grade: z.enum(['G1', 'G2', 'G3', 'G4']),
  fonction: z.string().optional(),
  service: z.string().optional(),
  managerId: z.string().optional(),
  actif: z.boolean().optional().default(true),
});

effectifsRouter.get('/', requirePermission(PERMISSIONS.HC_READ), async (req, res, next) => {
  try {
    const rows = await prisma.employe.findMany({
      where: { deletedAt: null },
      include: { manager: true, subordonnes: true },
      orderBy: { nom: 'asc' },
    });

    // Stats globales
    const stats = {
      total: rows.length,
      parContrat: { CDI: 0, CDD: 0 } as Record<string, number>,
      parGrade: {} as Record<string, number>,
    };
    for (const e of rows) {
      stats.parContrat[e.typeContrat] = (stats.parContrat[e.typeContrat] ?? 0) + 1;
      stats.parGrade[e.grade] = (stats.parGrade[e.grade] ?? 0) + 1;
    }

    res.json({ employes: rows, stats });
  } catch (err) { next(err); }
});

effectifsRouter.get('/organigramme', requirePermission(PERMISSIONS.HC_READ), async (req, res, next) => {
  try {
    // Managers (sans managerId = racine)
    const managers = await prisma.employe.findMany({
      where: { deletedAt: null, managerId: null },
      include: { subordonnes: { include: { subordonnes: true } } },
      orderBy: { nom: 'asc' },
    });
    res.json(managers);
  } catch (err) { next(err); }
});

effectifsRouter.post('/', requirePermission(PERMISSIONS.HC_MANAGE), async (req, res, next) => {
  try {
    const data = employeSchema.parse(req.body);
    const row = await prisma.employe.create({ data });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

effectifsRouter.put('/:id', requirePermission(PERMISSIONS.HC_MANAGE), async (req, res, next) => {
  try {
    const data = employeSchema.partial().parse(req.body);
    const row = await prisma.employe.update({ where: { id: req.params.id }, data });
    res.json(row);
  } catch (err) { next(err); }
});

effectifsRouter.delete('/:id', requirePermission(PERMISSIONS.HC_MANAGE), async (req, res, next) => {
  try {
    await prisma.employe.update({ where: { id: req.params.id }, data: { actif: false, deletedAt: new Date() } });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

// Budget de postes
effectifsRouter.get('/budget', requirePermission(PERMISSIONS.HC_READ), async (req, res, next) => {
  try {
    const annee = req.query.annee ? parseInt(String(req.query.annee)) : new Date().getFullYear();
    const rows = await prisma.budgetPoste.findMany({ where: { annee }, orderBy: [{ grade: 'asc' }, { fonction: 'asc' }] });
    res.json(rows);
  } catch (err) { next(err); }
});

effectifsRouter.put('/budget', requirePermission(PERMISSIONS.HC_MANAGE), async (req, res, next) => {
  try {
    const data = z.object({
      annee: z.number().int(),
      grade: z.string(),
      fonction: z.string().optional(),
      qteBudget: z.number().int(),
      qteActuel: z.number().int().optional().default(0),
    }).parse(req.body);

    const row = await prisma.budgetPoste.upsert({
      where: { annee_grade_fonction: { annee: data.annee, grade: data.grade, fonction: data.fonction ?? null } },
      create: data,
      update: { qteBudget: data.qteBudget, qteActuel: data.qteActuel ?? 0 },
    });
    res.json(row);
  } catch (err) { next(err); }
});
