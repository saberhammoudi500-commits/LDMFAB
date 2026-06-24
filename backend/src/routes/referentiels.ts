import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { recordAudit, clientIp } from '../utils/audit';
import { actorFromReq } from '../middleware/auth';

export const referentielsRouter = Router();
referentielsRouter.use(authenticate);

// ── Donneurs d'ordre ──────────────────────────────────────────
const donneurSchema = z.object({
  code: z.string().min(1),
  nom: z.string().min(1),
  description: z.string().optional(),
  actif: z.boolean().optional().default(true),
});

referentielsRouter.get('/donneurs', requirePermission(PERMISSIONS.REF_READ), async (req, res, next) => {
  try {
    const rows = await prisma.donneurOrdre.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
    });
    res.json(rows);
  } catch (err) { next(err); }
});

referentielsRouter.post('/donneurs', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const data = donneurSchema.parse(req.body);
    const row = await prisma.donneurOrdre.create({ data });
    await recordAudit({ actor: actorFromReq(req), action: 'CREATE', entity: 'DonneurOrdre', entityId: row.id, newValue: row, ip: clientIp(req) });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

referentielsRouter.put('/donneurs/:id', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const old = await prisma.donneurOrdre.findUniqueOrThrow({ where: { id: req.params.id } });
    const data = donneurSchema.partial().parse(req.body);
    const row = await prisma.donneurOrdre.update({ where: { id: req.params.id }, data });
    await recordAudit({ actor: actorFromReq(req), action: 'UPDATE', entity: 'DonneurOrdre', entityId: row.id, oldValue: old, newValue: row, ip: clientIp(req) });
    res.json(row);
  } catch (err) { next(err); }
});

// ── Formes galéniques ─────────────────────────────────────────
referentielsRouter.get('/formes', requirePermission(PERMISSIONS.REF_READ), async (_req, res, next) => {
  try {
    res.json(await prisma.formeGalenique.findMany({ orderBy: { nom: 'asc' } }));
  } catch (err) { next(err); }
});

referentielsRouter.post('/formes', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const data = z.object({ code: z.string().min(1), nom: z.string().min(1) }).parse(req.body);
    const row = await prisma.formeGalenique.create({ data });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// ── Produits ──────────────────────────────────────────────────
const produitSchema = z.object({
  codePF: z.string().min(1),
  designation: z.string().min(1),
  donneurOrdreId: z.string(),
  formeGaleniqueId: z.string(),
  activite: z.string().optional(),
  uniteConditionnement: z.string().optional(),
  nbUnitesParBoite: z.number().int().optional(),
  tailleStandardLot: z.number().optional(),
  dureeVie: z.number().int().optional(),
  aql: z.string().optional(),
  actif: z.boolean().optional().default(true),
});

referentielsRouter.get('/produits', requirePermission(PERMISSIONS.REF_READ), async (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const donneurId = String(req.query.donneurOrdreId ?? '').trim();
    const where: any = { deletedAt: null };
    if (search) where.OR = [{ codePF: { contains: search, mode: 'insensitive' } }, { designation: { contains: search, mode: 'insensitive' } }];
    if (donneurId) where.donneurOrdreId = donneurId;
    const rows = await prisma.produit.findMany({
      where,
      include: { donneurOrdre: true, formeGalenique: true },
      orderBy: { designation: 'asc' },
    });
    res.json(rows);
  } catch (err) { next(err); }
});

referentielsRouter.get('/produits/:id', requirePermission(PERMISSIONS.REF_READ), async (req, res, next) => {
  try {
    const p = await prisma.produit.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { donneurOrdre: true, formeGalenique: true, cadences: { include: { equipement: true } }, pcsuHistorique: { orderBy: { dateEffet: 'desc' } } },
    });
    res.json(p);
  } catch (err) { next(err); }
});

referentielsRouter.post('/produits', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const data = produitSchema.parse(req.body);
    const row = await prisma.produit.create({ data, include: { donneurOrdre: true, formeGalenique: true } });
    await recordAudit({ actor: actorFromReq(req), action: 'CREATE', entity: 'Produit', entityId: row.id, newValue: row, ip: clientIp(req) });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

referentielsRouter.put('/produits/:id', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const old = await prisma.produit.findUniqueOrThrow({ where: { id: req.params.id } });
    const data = produitSchema.partial().parse(req.body);
    const row = await prisma.produit.update({ where: { id: req.params.id }, data, include: { donneurOrdre: true, formeGalenique: true } });
    await recordAudit({ actor: actorFromReq(req), action: 'UPDATE', entity: 'Produit', entityId: row.id, oldValue: old, newValue: row, ip: clientIp(req) });
    res.json(row);
  } catch (err) { next(err); }
});

// ── Equipements ───────────────────────────────────────────────
const equipSchema = z.object({
  code: z.string().min(1),
  nom: z.string().min(1),
  atelier: z.string().min(1),
  type: z.string().optional(),
  actif: z.boolean().optional().default(true),
});

referentielsRouter.get('/equipements', requirePermission(PERMISSIONS.REF_READ), async (req, res, next) => {
  try {
    const atelier = String(req.query.atelier ?? '').trim();
    const where: any = { deletedAt: null };
    if (atelier) where.atelier = atelier;
    res.json(await prisma.equipement.findMany({ where, orderBy: { nom: 'asc' } }));
  } catch (err) { next(err); }
});

referentielsRouter.post('/equipements', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const data = equipSchema.parse(req.body);
    const row = await prisma.equipement.create({ data });
    await recordAudit({ actor: actorFromReq(req), action: 'CREATE', entity: 'Equipement', entityId: row.id, newValue: row, ip: clientIp(req) });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

referentielsRouter.put('/equipements/:id', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const data = equipSchema.partial().parse(req.body);
    const row = await prisma.equipement.update({ where: { id: req.params.id }, data });
    res.json(row);
  } catch (err) { next(err); }
});

// ── Cadences ──────────────────────────────────────────────────
referentielsRouter.get('/cadences', requirePermission(PERMISSIONS.REF_READ), async (req, res, next) => {
  try {
    const produitId = String(req.query.produitId ?? '').trim();
    const where: any = {};
    if (produitId) where.produitId = produitId;
    res.json(await prisma.cadence.findMany({ where, include: { produit: true, equipement: true } }));
  } catch (err) { next(err); }
});

referentielsRouter.post('/cadences', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const data = z.object({
      produitId: z.string(), equipementId: z.string(),
      typeOperation: z.string(), uniteHeure: z.number().positive(),
    }).parse(req.body);
    const row = await prisma.cadence.upsert({
      where: { produitId_equipementId_typeOperation: { produitId: data.produitId, equipementId: data.equipementId, typeOperation: data.typeOperation } },
      create: data, update: { uniteHeure: data.uniteHeure },
      include: { produit: true, equipement: true },
    });
    res.json(row);
  } catch (err) { next(err); }
});

// ── PCSU ──────────────────────────────────────────────────────
referentielsRouter.get('/pcsu', requirePermission(PERMISSIONS.REF_READ), async (req, res, next) => {
  try {
    const produitId = String(req.query.produitId ?? '').trim();
    const where: any = { deletedAt: null };
    if (produitId) where.produitId = produitId;
    res.json(await prisma.pcsu.findMany({ where, include: { produit: true }, orderBy: { dateEffet: 'desc' } }));
  } catch (err) { next(err); }
});

referentielsRouter.post('/pcsu', requirePermission(PERMISSIONS.REF_MANAGE), async (req, res, next) => {
  try {
    const data = z.object({
      produitId: z.string(), activite: z.string().optional(),
      valeur: z.number().positive(), dateEffet: z.string().datetime(),
    }).parse(req.body);
    const row = await prisma.pcsu.create({ data: { ...data, dateEffet: new Date(data.dateEffet) } });
    res.status(201).json(row);
  } catch (err) { next(err); }
});
