import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, actorFromReq } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { recordAudit, clientIp } from '../utils/audit';

export const pdpRouter = Router();
pdpRouter.use(authenticate);

// ── PDP : liste des périodes ───────────────────────────────────
pdpRouter.get('/', requirePermission(PERMISSIONS.PDP_READ), async (req, res, next) => {
  try {
    const annee = req.query.annee ? parseInt(String(req.query.annee)) : undefined;
    const where: any = {};
    if (annee) where.annee = annee;
    const rows = await prisma.pdp.findMany({
      where,
      include: {
        lignes: {
          include: { produit: { include: { donneurOrdre: true, formeGalenique: true } }, donneurOrdre: true },
        },
      },
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
    });
    res.json(rows);
  } catch (err) { next(err); }
});

// ── PDP : vue consolidée YTD ──────────────────────────────────
pdpRouter.get('/ytd/:annee', requirePermission(PERMISSIONS.PDP_READ), async (req, res, next) => {
  try {
    const annee = parseInt(req.params.annee);
    const lignes = await prisma.pdpLigne.findMany({
      where: { pdp: { annee } },
      include: {
        produit: { include: { donneurOrdre: true, formeGalenique: true } },
        donneurOrdre: true,
        pdp: true,
      },
    });

    // Agrégation par produit
    const byProduit: Record<string, any> = {};
    for (const l of lignes) {
      const key = l.produitId;
      if (!byProduit[key]) {
        byProduit[key] = {
          produit: l.produit,
          donneurOrdre: l.donneurOrdre,
          planFabTotal: 0, planCndtTotal: 0, planValeurTotal: 0,
          realiseFabTotal: 0, realiseCndtTotal: 0, realiseValeurTotal: 0,
          mois: {},
        };
      }
      const e = byProduit[key];
      e.planFabTotal += l.planQteFab ?? 0;
      e.planCndtTotal += l.planQteCndt ?? 0;
      e.planValeurTotal += l.planValeur ?? 0;
      e.realiseFabTotal += l.realiseFab ?? 0;
      e.realiseCndtTotal += l.realiseCndt ?? 0;
      e.realiseValeurTotal += l.realiseValeur ?? 0;
      e.mois[l.pdp.mois] = {
        planFab: l.planQteFab, planCndt: l.planQteCndt, planValeur: l.planValeur,
        realiseFab: l.realiseFab, realiseCndt: l.realiseCndt, realiseValeur: l.realiseValeur,
      };
    }

    const result = Object.values(byProduit).map((e: any) => ({
      ...e,
      tauxFab: e.planFabTotal > 0 ? (e.realiseFabTotal / e.planFabTotal) * 100 : null,
      tauxCndt: e.planCndtTotal > 0 ? (e.realiseCndtTotal / e.planCndtTotal) * 100 : null,
      gapValeur: e.realiseValeurTotal - e.planValeurTotal,
    }));

    res.json({ annee, lignes: result });
  } catch (err) { next(err); }
});

// ── PDP : détail d'une période ────────────────────────────────
pdpRouter.get('/:annee/:mois', requirePermission(PERMISSIONS.PDP_READ), async (req, res, next) => {
  try {
    const annee = parseInt(req.params.annee);
    const mois = parseInt(req.params.mois);
    const pdp = await prisma.pdp.findUnique({
      where: { annee_mois: { annee, mois } },
      include: {
        lignes: {
          include: { produit: { include: { donneurOrdre: true, formeGalenique: true } }, donneurOrdre: true },
        },
        calendrier: { orderBy: { date: 'asc' } },
      },
    });
    if (!pdp) return res.status(404).json({ error: 'PDP introuvable.' });

    const lignesWithRate = pdp.lignes.map((l) => ({
      ...l,
      tauxFab: l.planQteFab && l.planQteFab > 0 ? ((l.realiseFab ?? 0) / l.planQteFab) * 100 : null,
      tauxCndt: l.planQteCndt && l.planQteCndt > 0 ? ((l.realiseCndt ?? 0) / l.planQteCndt) * 100 : null,
      gapValeur: (l.realiseValeur ?? 0) - (l.planValeur ?? 0),
    }));

    res.json({ ...pdp, lignes: lignesWithRate });
  } catch (err) { next(err); }
});

// ── PDP : créer ou mettre à jour une ligne ────────────────────
const ligneSchema = z.object({
  produitId: z.string(),
  donneurOrdreId: z.string(),
  planQteFab: z.number().optional(),
  planQteCndt: z.number().optional(),
  planValeur: z.number().optional(),
  realiseFab: z.number().optional(),
  realiseCndt: z.number().optional(),
  realiseValeur: z.number().optional(),
});

pdpRouter.put('/:annee/:mois/lignes', requirePermission(PERMISSIONS.PDP_MANAGE), async (req, res, next) => {
  try {
    const annee = parseInt(req.params.annee);
    const mois = parseInt(req.params.mois);

    const pdp = await prisma.pdp.upsert({
      where: { annee_mois: { annee, mois } },
      create: { annee, mois },
      update: {},
    });

    const data = ligneSchema.parse(req.body);
    const ligne = await prisma.pdpLigne.upsert({
      where: { pdpId_produitId: { pdpId: pdp.id, produitId: data.produitId } },
      create: { pdpId: pdp.id, ...data },
      update: data,
    });

    await recordAudit({ actor: actorFromReq(req), action: 'UPDATE', entity: 'PdpLigne', entityId: ligne.id, newValue: ligne, ip: clientIp(req) });
    res.json(ligne);
  } catch (err) { next(err); }
});

// ── Calendrier ────────────────────────────────────────────────
pdpRouter.put('/:annee/:mois/calendrier', requirePermission(PERMISSIONS.PDP_MANAGE), async (req, res, next) => {
  try {
    const annee = parseInt(req.params.annee);
    const mois = parseInt(req.params.mois);
    const jours = z.array(z.object({ date: z.string(), type: z.enum(['OUVRE', 'FERIE', 'WEEKEND']) })).parse(req.body);

    const pdp = await prisma.pdp.upsert({
      where: { annee_mois: { annee, mois } },
      create: { annee, mois },
      update: {},
    });

    for (const j of jours) {
      await prisma.calendrierJour.upsert({
        where: { pdpId_date: { pdpId: pdp.id, date: new Date(j.date) } },
        create: { pdpId: pdp.id, date: new Date(j.date), type: j.type },
        update: { type: j.type },
      });
    }

    res.json({ updated: jours.length });
  } catch (err) { next(err); }
});
