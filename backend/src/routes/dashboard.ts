import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/', requirePermission(PERMISSIONS.DASHBOARD_READ), async (_req, res, next) => {
  try {
    const baseWhere = { deletedAt: null };
    const now = new Date();
    const alerte30j = new Date(); alerte30j.setDate(alerte30j.getDate() + 30);
    const debutAnnee = new Date(`${now.getFullYear()}-01-01`);

    const [
      totalOF,
      parStatut,
      ofPeremptionProche,
      ofPerimes,
      ddlAttente,
      phases,
      conditionnements,
      pdpAnnee,
    ] = await Promise.all([
      prisma.ordreFabrication.count({ where: baseWhere }),

      prisma.ordreFabrication.groupBy({
        by: ['workflowStatus'], where: baseWhere, _count: true,
      }),

      prisma.ordreFabrication.count({
        where: { ...baseWhere, finValiditeOF: { gte: now, lte: alerte30j }, workflowStatus: { notIn: ['CLOTURE'] } },
      }),

      prisma.ordreFabrication.count({
        where: { ...baseWhere, finValiditeOF: { lt: now }, workflowStatus: { notIn: ['CLOTURE'] } },
      }),

      prisma.dossierLot.count({
        where: { statut: { notIn: ['VALIDE'] } },
      }),

      // Rendements moyens
      prisma.phaseRealisation.findMany({
        where: { dateFin: { gte: debutAnnee }, statut: 'TERMINE', rendementKg: { not: null } },
        select: { phase: true, rendementKg: true, rendementUn: true },
      }),

      // Taux conditionnement
      prisma.conditionnement.findMany({
        where: { statut: 'TERMINE', tauxCndt: { not: null } },
        select: { tauxCndt: true },
      }),

      // PDP en cours (mois courant)
      prisma.pdp.findUnique({
        where: { annee_mois: { annee: now.getFullYear(), mois: now.getMonth() + 1 } },
        include: { lignes: true },
      }),
    ]);

    // Calculs rendements
    const rendParPhase: Record<string, number[]> = {};
    for (const p of phases) {
      if (!rendParPhase[p.phase]) rendParPhase[p.phase] = [];
      if (p.rendementKg != null) rendParPhase[p.phase].push(p.rendementKg);
    }
    const rendementsMoyensParPhase = Object.entries(rendParPhase).map(([phase, vals]) => ({
      phase,
      rendementMoyen: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : null,
      count: vals.length,
    }));

    const allRend = phases.map((p) => p.rendementKg).filter((r): r is number => r !== null);
    const rendementMoyen = allRend.length
      ? Math.round(allRend.reduce((a, b) => a + b, 0) / allRend.length * 100) / 100 : null;

    const tauxCndts = conditionnements.map((c) => c.tauxCndt).filter((r): r is number => r !== null);
    const tauxCndtMoyen = tauxCndts.length
      ? Math.round(tauxCndts.reduce((a, b) => a + b, 0) / tauxCndts.length * 100) / 100 : null;

    // PDP taux réalisation
    let tauxRealisationFab: number | null = null;
    let tauxRealisationCndt: number | null = null;
    let gapCA: number | null = null;
    if (pdpAnnee?.lignes.length) {
      const planFab = pdpAnnee.lignes.reduce((s, l) => s + (l.planQteFab ?? 0), 0);
      const reelFab = pdpAnnee.lignes.reduce((s, l) => s + (l.realiseFab ?? 0), 0);
      const planCndt = pdpAnnee.lignes.reduce((s, l) => s + (l.planQteCndt ?? 0), 0);
      const reelCndt = pdpAnnee.lignes.reduce((s, l) => s + (l.realiseCndt ?? 0), 0);
      const planVal = pdpAnnee.lignes.reduce((s, l) => s + (l.planValeur ?? 0), 0);
      const reelVal = pdpAnnee.lignes.reduce((s, l) => s + (l.realiseValeur ?? 0), 0);
      tauxRealisationFab = planFab > 0 ? Math.round(reelFab / planFab * 10000) / 100 : null;
      tauxRealisationCndt = planCndt > 0 ? Math.round(reelCndt / planCndt * 10000) / 100 : null;
      gapCA = reelVal - planVal;
    }

    const statuts: Record<string, number> = {};
    for (const s of parStatut) {
      statuts[s.workflowStatus] = typeof s._count === 'number' ? s._count : 0;
    }

    res.json({
      // OF
      totalOF,
      ofEnCours: (statuts['EN_COURS'] ?? 0) + (statuts['RECU'] ?? 0),
      ofSfDeclares: statuts['SF_DECLARE'] ?? 0,
      ofConditionnes: statuts['CONDITIONNE'] ?? 0,
      ofClotures: statuts['CLOTURE'] ?? 0,
      ofPerimesProche: ofPeremptionProche,
      ofPerimes,
      repartitionStatut: parStatut.map((s) => ({
        statut: s.workflowStatus,
        count: typeof s._count === 'number' ? s._count : 0,
      })),
      // Qualite
      ddlEnAttente: ddlAttente,
      // Performance
      rendementMoyen,
      rendementsMoyensParPhase,
      tauxCndtMoyen,
      // PDP mois courant
      tauxRealisationFab,
      tauxRealisationCndt,
      gapCA,
    });
  } catch (err) { next(err); }
});
