import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, actorFromReq } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { recordAudit, clientIp } from '../utils/audit';

export const fabricationRouter = Router();
fabricationRouter.use(authenticate);

const PHASES = ['PESEE', 'GRANULATION', 'MELANGE', 'COMPRESSION', 'GELULE', 'PELLICULAGE', 'CREME'] as const;

// ── Liste des OF avec phases et conditionnement ───────────────
fabricationRouter.get('/of', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '25')) || 25));
    const search = String(req.query.search ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const produitId = String(req.query.produitId ?? '').trim();
    const donneurOrdreId = String(req.query.donneurOrdreId ?? '').trim();
    const alertePeremption = req.query.alertePeremption === 'true';

    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { numeroOF: { contains: search, mode: 'insensitive' } },
      { numeroLot: { contains: search, mode: 'insensitive' } },
      { produit: { designation: { contains: search, mode: 'insensitive' } } },
    ];
    if (status) where.workflowStatus = status;
    if (produitId) where.produitId = produitId;
    if (donneurOrdreId) where.produit = { donneurOrdreId };
    if (alertePeremption) {
      const limit = new Date();
      limit.setDate(limit.getDate() + 30);
      where.finValiditeOF = { lte: limit };
      where.workflowStatus = { notIn: ['CLOTURE'] };
    }

    const [total, rows] = await Promise.all([
      prisma.ordreFabrication.count({ where }),
      prisma.ordreFabrication.findMany({
        where,
        include: {
          produit: { include: { donneurOrdre: true, formeGalenique: true } },
          phasesRealisation: { include: { equipement: true } },
          conditionnement: { include: { equipement: true } },
          ddl: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = rows.map(enrichOf);
    res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) { next(err); }
});

// ── Détail d'un OF ────────────────────────────────────────────
fabricationRouter.get('/of/:id', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const of = await prisma.ordreFabrication.findFirstOrThrow({
      where: { id: req.params.id, deletedAt: null },
      include: {
        produit: { include: { donneurOrdre: true, formeGalenique: true, cadences: { include: { equipement: true } } } },
        phasesRealisation: { include: { equipement: true, operateur: { select: { id: true, firstName: true, lastName: true } }, superviseur: { select: { id: true, firstName: true, lastName: true } } } },
        conditionnement: { include: { equipement: true } },
        ddl: { include: { verificateur: { select: { id: true, firstName: true, lastName: true } } } },
        prolongations: true,
        signatures: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json(enrichOf(of));
  } catch (err) { next(err); }
});

// ── Créer un OF ───────────────────────────────────────────────
const ofCreateSchema = z.object({
  numeroOF: z.string().min(1),
  produitId: z.string(),
  numeroLot: z.string().min(1),
  receptionOF: z.string().datetime().optional(),
  finValiditeOF: z.string().datetime().optional(),
  tailleLoT: z.number().optional(),
  qteTheorique: z.number().optional(),
});

fabricationRouter.post('/of', requirePermission(PERMISSIONS.OF_CREATE), async (req, res, next) => {
  try {
    const data = ofCreateSchema.parse(req.body);
    const of = await prisma.ordreFabrication.create({
      data: {
        ...data,
        receptionOF: data.receptionOF ? new Date(data.receptionOF) : undefined,
        finValiditeOF: data.finValiditeOF ? new Date(data.finValiditeOF) : undefined,
        createdById: (req as any).user?.id,
      },
      include: { produit: { include: { donneurOrdre: true, formeGalenique: true } } },
    });
    await recordAudit({ actor: actorFromReq(req), action: 'CREATE', entity: 'OrdreFabrication', entityId: of.id, newValue: of, ip: clientIp(req) });
    res.status(201).json(enrichOf(of as any));
  } catch (err) { next(err); }
});

// ── Modifier un OF ────────────────────────────────────────────
const ofUpdateSchema = z.object({
  receptionOF: z.string().datetime().optional(),
  finValiditeOF: z.string().datetime().optional(),
  tailleLoT: z.number().optional(),
  qteTheorique: z.number().optional(),
  dateDeclarationSF: z.string().datetime().optional(),
  qteSF: z.number().optional(),
  reason: z.string().optional(),
});

fabricationRouter.put('/of/:id', requirePermission(PERMISSIONS.OF_UPDATE), async (req, res, next) => {
  try {
    const old = await prisma.ordreFabrication.findFirstOrThrow({ where: { id: req.params.id, deletedAt: null } });
    const { reason, ...data } = ofUpdateSchema.parse(req.body);
    const updated = await prisma.ordreFabrication.update({
      where: { id: req.params.id },
      data: {
        ...data,
        receptionOF: data.receptionOF ? new Date(data.receptionOF) : undefined,
        finValiditeOF: data.finValiditeOF ? new Date(data.finValiditeOF) : undefined,
        dateDeclarationSF: data.dateDeclarationSF ? new Date(data.dateDeclarationSF) : undefined,
      },
      include: { produit: { include: { donneurOrdre: true, formeGalenique: true } } },
    });
    await recordAudit({ actor: actorFromReq(req), action: 'UPDATE', entity: 'OrdreFabrication', entityId: old.id, reason, oldValue: old, newValue: updated, ip: clientIp(req) });
    res.json(enrichOf(updated as any));
  } catch (err) { next(err); }
});

// ── Transition de workflow ────────────────────────────────────
fabricationRouter.post('/of/:id/transition', requirePermission(PERMISSIONS.OF_UPDATE), async (req, res, next) => {
  try {
    const { statut, reason } = z.object({ statut: z.string(), reason: z.string().optional() }).parse(req.body);
    const of = await prisma.ordreFabrication.findFirstOrThrow({ where: { id: req.params.id, deletedAt: null } });
    const updated = await prisma.ordreFabrication.update({
      where: { id: req.params.id },
      data: { workflowStatus: statut },
    });
    await recordAudit({ actor: actorFromReq(req), action: 'UPDATE', entity: 'OrdreFabrication', entityId: of.id, reason: reason ?? `Transition → ${statut}`, oldValue: { workflowStatus: of.workflowStatus }, newValue: { workflowStatus: statut }, ip: clientIp(req) });
    res.json({ id: updated.id, workflowStatus: updated.workflowStatus });
  } catch (err) { next(err); }
});

// ── Supprimer (soft) un OF ────────────────────────────────────
fabricationRouter.delete('/of/:id', requirePermission(PERMISSIONS.OF_DELETE), async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    const of = await prisma.ordreFabrication.findFirstOrThrow({ where: { id: req.params.id, deletedAt: null } });
    await prisma.ordreFabrication.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await recordAudit({ actor: actorFromReq(req), action: 'DELETE', entity: 'OrdreFabrication', entityId: of.id, reason, ip: clientIp(req) });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

// ── Prolongations ─────────────────────────────────────────────
fabricationRouter.post('/of/:id/prolongations', requirePermission(PERMISSIONS.OF_UPDATE), async (req, res, next) => {
  try {
    const data = z.object({
      dateFinActuelle: z.string().datetime().optional(),
      observation: z.string().optional(),
    }).parse(req.body);
    const row = await prisma.prolongationOF.create({
      data: {
        ofId: req.params.id,
        dateFinActuelle: data.dateFinActuelle ? new Date(data.dateFinActuelle) : undefined,
        observation: data.observation,
      },
    });
    await recordAudit({ actor: actorFromReq(req), action: 'CREATE', entity: 'ProlongationOF', entityId: row.id, newValue: row, ip: clientIp(req) });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// ── Phases de réalisation ─────────────────────────────────────
fabricationRouter.get('/of/:id/phases', requirePermission(PERMISSIONS.PHASE_READ), async (req, res, next) => {
  try {
    const phases = await prisma.phaseRealisation.findMany({
      where: { ofId: req.params.id },
      include: { equipement: true, operateur: { select: { id: true, firstName: true, lastName: true } }, superviseur: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(phases);
  } catch (err) { next(err); }
});

const phaseSchema = z.object({
  phase: z.enum(PHASES),
  equipementId: z.string().optional(),
  dateDebut: z.string().datetime().optional(),
  dateFin: z.string().datetime().optional(),
  qteEntreeKg: z.number().optional(),
  qteSortieKg: z.number().optional(),
  qteEntreeUn: z.number().optional(),
  qteSortieUn: z.number().optional(),
  avarieKg: z.number().optional(),
  avarieUn: z.number().optional(),
  operateurId: z.string().optional(),
  superviseurId: z.string().optional(),
  statut: z.string().optional(),
  observation: z.string().optional(),
});

fabricationRouter.put('/of/:id/phases/:phase', requirePermission(PERMISSIONS.PHASE_SAISIE), async (req, res, next) => {
  try {
    const { phase } = req.params;
    const data = phaseSchema.parse({ ...req.body, phase });

    const rendementKg = (data.qteEntreeKg && data.qteSortieKg)
      ? (data.qteSortieKg / data.qteEntreeKg) * 100 : undefined;
    const rendementUn = (data.qteEntreeUn && data.qteSortieUn)
      ? (data.qteSortieUn / data.qteEntreeUn) * 100 : undefined;

    const row = await prisma.phaseRealisation.upsert({
      where: { ofId_phase: { ofId: req.params.id, phase } },
      create: {
        ofId: req.params.id, ...data,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
        dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
        rendementKg, rendementUn,
      },
      update: {
        ...data,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
        dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
        rendementKg, rendementUn,
      },
      include: { equipement: true },
    });

    await recordAudit({ actor: actorFromReq(req), action: 'UPDATE', entity: 'PhaseRealisation', entityId: row.id, newValue: row, ip: clientIp(req) });
    res.json(row);
  } catch (err) { next(err); }
});

// ── Conditionnement ───────────────────────────────────────────
fabricationRouter.get('/of/:id/conditionnement', requirePermission(PERMISSIONS.CNDT_READ), async (req, res, next) => {
  try {
    const cndt = await prisma.conditionnement.findUnique({
      where: { ofId: req.params.id },
      include: { equipement: true },
    });
    res.json(cndt);
  } catch (err) { next(err); }
});

const cndtSchema = z.object({
  equipementId: z.string().optional(),
  dateDebutCndt: z.string().datetime().optional(),
  dateFinCndt: z.string().datetime().optional(),
  qteFabrique: z.number().optional(),
  qteCndt: z.number().optional(),
  operateurId: z.string().optional(),
  superviseurId: z.string().optional(),
  statut: z.string().optional(),
});

fabricationRouter.put('/of/:id/conditionnement', requirePermission(PERMISSIONS.CNDT_MANAGE), async (req, res, next) => {
  try {
    const data = cndtSchema.parse(req.body);
    const qteRestante = (data.qteFabrique != null && data.qteCndt != null)
      ? data.qteFabrique - data.qteCndt : undefined;
    const tauxCndt = (data.qteFabrique && data.qteCndt)
      ? (data.qteCndt / data.qteFabrique) * 100 : undefined;

    const row = await prisma.conditionnement.upsert({
      where: { ofId: req.params.id },
      create: {
        ofId: req.params.id, ...data,
        dateDebutCndt: data.dateDebutCndt ? new Date(data.dateDebutCndt) : undefined,
        dateFinCndt: data.dateFinCndt ? new Date(data.dateFinCndt) : undefined,
        qteRestante, tauxCndt,
      },
      update: {
        ...data,
        dateDebutCndt: data.dateDebutCndt ? new Date(data.dateDebutCndt) : undefined,
        dateFinCndt: data.dateFinCndt ? new Date(data.dateFinCndt) : undefined,
        qteRestante, tauxCndt,
      },
      include: { equipement: true },
    });

    await recordAudit({ actor: actorFromReq(req), action: 'UPDATE', entity: 'Conditionnement', entityId: row.id, newValue: row, ip: clientIp(req) });
    res.json(row);
  } catch (err) { next(err); }
});

// ── DDL ───────────────────────────────────────────────────────
fabricationRouter.get('/of/:id/ddl', requirePermission(PERMISSIONS.DDL_READ), async (req, res, next) => {
  try {
    const ddl = await prisma.dossierLot.findUnique({
      where: { ofId: req.params.id },
      include: { verificateur: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(ddl);
  } catch (err) { next(err); }
});

const ddlSchema = z.object({
  verificateurId: z.string().optional(),
  dateEmission: z.string().datetime().optional(),
  dateEnvoi: z.string().datetime().optional(),
  dateReception: z.string().datetime().optional(),
  dateVerification: z.string().datetime().optional(),
  dateValidation: z.string().datetime().optional(),
  dateEnvoiRectif: z.string().datetime().optional(),
  dateReceptionRectif: z.string().datetime().optional(),
  dateRenvoi: z.string().datetime().optional(),
  statut: z.string().optional(),
  observation: z.string().optional(),
});

fabricationRouter.put('/of/:id/ddl', requirePermission(PERMISSIONS.DDL_MANAGE), async (req, res, next) => {
  try {
    const data = ddlSchema.parse(req.body);
    const parseDate = (d?: string) => d ? new Date(d) : undefined;

    const ddlData = {
      ...data,
      dateEmission: parseDate(data.dateEmission),
      dateEnvoi: parseDate(data.dateEnvoi),
      dateReception: parseDate(data.dateReception),
      dateVerification: parseDate(data.dateVerification),
      dateValidation: parseDate(data.dateValidation),
      dateEnvoiRectif: parseDate(data.dateEnvoiRectif),
      dateReceptionRectif: parseDate(data.dateReceptionRectif),
      dateRenvoi: parseDate(data.dateRenvoi),
    };

    const row = await prisma.dossierLot.upsert({
      where: { ofId: req.params.id },
      create: { ofId: req.params.id, ...ddlData },
      update: ddlData,
    });

    await recordAudit({ actor: actorFromReq(req), action: 'UPDATE', entity: 'DossierLot', entityId: row.id, newValue: row, ip: clientIp(req) });
    res.json(row);
  } catch (err) { next(err); }
});

// ── Suivi par atelier ─────────────────────────────────────────
fabricationRouter.get('/atelier', requirePermission(PERMISSIONS.PHASE_READ), async (req, res, next) => {
  try {
    const statut = String(req.query.statut ?? '').trim();
    const where: any = { deletedAt: null };
    if (statut) where.workflowStatus = statut;
    else where.workflowStatus = { in: ['EN_COURS', 'SF_DECLARE'] };

    const rows = await prisma.ordreFabrication.findMany({
      where,
      include: {
        produit: { include: { donneurOrdre: true, formeGalenique: true } },
        phasesRealisation: { include: { equipement: true } },
        conditionnement: true,
      },
      orderBy: { finValiditeOF: 'asc' },
    });
    res.json(rows.map(enrichOf));
  } catch (err) { next(err); }
});

// ── En-cours (disponibilité produit) ─────────────────────────
fabricationRouter.get('/encours', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const rows = await prisma.ordreFabrication.findMany({
      where: {
        deletedAt: null,
        workflowStatus: 'SF_DECLARE',
        conditionnement: { is: null },
      },
      include: {
        produit: { include: { donneurOrdre: true, pcsuHistorique: { orderBy: { dateEffet: 'desc' }, take: 1 } } },
        prolongations: { orderBy: { dateDemande: 'desc' }, take: 1 },
      },
      orderBy: { finValiditeOF: 'asc' },
    });

    const now = new Date();
    const enriched = rows.map((r) => {
      const joursValidite = r.finValiditeOF
        ? Math.ceil((r.finValiditeOF.getTime() - now.getTime()) / 86400000) : null;
      const pcsu = r.produit.pcsuHistorique[0]?.valeur ?? null;
      const valeur = pcsu && r.qteSF ? r.qteSF * pcsu : null;
      return { ...r, joursValidite, valeur, alerte: joursValidite !== null && joursValidite < 30 };
    });

    res.json(enriched);
  } catch (err) { next(err); }
});

// ── Rendements ────────────────────────────────────────────────
fabricationRouter.get('/rendements', requirePermission(PERMISSIONS.OF_READ), async (req, res, next) => {
  try {
    const annee = req.query.annee ? parseInt(String(req.query.annee)) : new Date().getFullYear();
    const phases = await prisma.phaseRealisation.findMany({
      where: {
        dateFin: {
          gte: new Date(`${annee}-01-01`),
          lt: new Date(`${annee + 1}-01-01`),
        },
        statut: 'TERMINE',
      },
      include: {
        of: {
          include: { produit: { include: { donneurOrdre: true, formeGalenique: true } } },
        },
      },
    });

    // Agrégation par phase
    const byPhase: Record<string, { count: number; totalKg: number; totalUn: number }> = {};
    for (const p of phases) {
      if (!byPhase[p.phase]) byPhase[p.phase] = { count: 0, totalKg: 0, totalUn: 0 };
      byPhase[p.phase].count++;
      byPhase[p.phase].totalKg += p.rendementKg ?? 0;
      byPhase[p.phase].totalUn += p.rendementUn ?? 0;
    }

    const rendParPhase = Object.entries(byPhase).map(([phase, v]) => ({
      phase,
      count: v.count,
      rendementMoyenKg: v.count > 0 ? v.totalKg / v.count : null,
      rendementMoyenUn: v.count > 0 ? v.totalUn / v.count : null,
    }));

    res.json({ annee, rendParPhase });
  } catch (err) { next(err); }
});

// ── DDL en attente ────────────────────────────────────────────
fabricationRouter.get('/ddl/attente', requirePermission(PERMISSIONS.DDL_READ), async (req, res, next) => {
  try {
    const rows = await prisma.dossierLot.findMany({
      where: { statut: { notIn: ['VALIDE'] } },
      include: {
        of: { include: { produit: { include: { donneurOrdre: true } } } },
        verificateur: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dateEnvoi: 'asc' },
    });

    const now = new Date();
    const enriched = rows.map((d) => {
      const joursAttente = d.dateEnvoi
        ? Math.ceil((now.getTime() - d.dateEnvoi.getTime()) / 86400000) : null;
      return { ...d, joursAttente, alerte: joursAttente !== null && joursAttente > 7 };
    });

    res.json(enriched);
  } catch (err) { next(err); }
});

// ── Helpers ───────────────────────────────────────────────────
function enrichOf(of: any) {
  const now = new Date();
  const joursValidite = of.finValiditeOF
    ? Math.ceil((new Date(of.finValiditeOF).getTime() - now.getTime()) / 86400000) : null;
  const alertePeremption = joursValidite !== null && joursValidite < 30 && of.workflowStatus !== 'CLOTURE';

  // Rendement total basé sur phases
  let rendementTotal: number | null = null;
  if (of.phasesRealisation?.length) {
    const finished = of.phasesRealisation.filter((p: any) => p.rendementKg != null);
    if (finished.length) {
      rendementTotal = finished.reduce((s: number, p: any) => s + (p.rendementKg ?? 0), 0) / finished.length;
    }
  }

  // Délais
  const phases = of.phasesRealisation ?? [];
  const pesee = phases.find((p: any) => p.phase === 'PESEE');
  const lastFab = phases.reduce((acc: any, p: any) => {
    if (!p.dateFin) return acc;
    if (!acc || new Date(p.dateFin) > new Date(acc)) return p.dateFin;
    return acc;
  }, null);
  const delaisFab = (pesee?.dateDebut && lastFab)
    ? Math.ceil((new Date(lastFab).getTime() - new Date(pesee.dateDebut).getTime()) / 86400000) : null;

  return { ...of, joursValidite, alertePeremption, rendementTotal, delaisFab };
}
