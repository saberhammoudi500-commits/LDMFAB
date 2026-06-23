import { Router } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { prisma } from '../prisma';
import { authenticate, actorFromReq } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { recordAudit, clientIp } from '../utils/audit';
import { EXCEL_COLUMNS } from '../services/excelColumns';
import { parseFrDate, parseFrNumber, formatFrDate } from '../utils/dates';
import { computeRendementTotal } from '../utils/yield';

export const importExportRouter = Router();
importExportRouter.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ---------------------- EXPORT ----------------------
importExportRouter.get('/export', requirePermission(PERMISSIONS.OF_EXPORT), async (req, res, next) => {
  try {
    const rows = await prisma.ordreFabrication.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'LDMFAB';
    const ws = wb.addWorksheet('Realisations');
    ws.columns = EXCEL_COLUMNS.map((c) => ({ header: c.header, key: c.field, width: 18 }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const of of rows) {
      const record: Record<string, unknown> = {};
      for (const col of EXCEL_COLUMNS) {
        const value = (of as any)[col.field];
        if (col.type === 'date') record[col.field] = formatFrDate(value);
        else record[col.field] = value ?? '';
      }
      ws.addRow(record);
    }

    await recordAudit({
      action: 'EXPORT',
      entity: 'OrdreFabrication',
      reason: `Export Excel de ${rows.length} ordres`,
      actor: actorFromReq(req),
      ipAddress: clientIp(req),
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="realisations-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// ---------------------- IMPORT ----------------------
importExportRouter.post('/import', requirePermission(PERMISSIONS.OF_IMPORT), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier Excel manquant (champ "file").' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer as any);
    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ error: 'Feuille de calcul introuvable.' });

    // Mapping par position de colonne (1-based), aligne sur EXCEL_COLUMNS
    const headerRow = ws.getRow(1);
    const created: string[] = [];
    const errors: Array<{ ligne: number; message: string }> = [];
    let imported = 0;

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      if (!row.hasValues) continue;

      const record: Record<string, any> = {};
      EXCEL_COLUMNS.forEach((col, idx) => {
        const cell = row.getCell(idx + 1);
        const raw = cell.value;
        let value: unknown = raw;
        if (raw && typeof raw === 'object' && 'text' in (raw as any)) value = (raw as any).text;
        if (raw && typeof raw === 'object' && 'result' in (raw as any)) value = (raw as any).result;

        if (col.type === 'date') record[col.field] = parseFrDate(value as any);
        else if (col.type === 'number') record[col.field] = parseFrNumber(value as any);
        else record[col.field] = value === null || value === undefined ? null : String(value).trim();
      });

      if (!record.codeProduit || !record.designation || !record.numeroLot) {
        errors.push({ ligne: r, message: 'codeProduit, designation et numeroLot sont obligatoires.' });
        continue;
      }

      // Rendement total recalcule si absent
      if (record.rendementTotal === null) {
        record.rendementTotal = computeRendementTotal(record.quantiteKg, record.quantiteTheoriqueKg);
      }

      try {
        const of = await prisma.ordreFabrication.create({
          data: {
            dateDeclarationSF: record.dateDeclarationSF,
            receptionOF: record.receptionOF,
            finValiditeOF: record.finValiditeOF,
            validiteOF: record.validiteOF,
            cndt: record.cndt,
            codeProduit: record.codeProduit,
            designation: record.designation,
            numeroLot: record.numeroLot,
            dateFinPesee: record.dateFinPesee,
            dateFinGranulation: record.dateFinGranulation,
            dateFinMelange: record.dateFinMelange,
            dateFinCompRemp: record.dateFinCompRemp,
            dateFinPelliculage: record.dateFinPelliculage,
            quantiteKg: record.quantiteKg,
            quantiteFabriqueeCps: record.quantiteFabriqueeCps,
            quantiteTheoriqueKg: record.quantiteTheoriqueKg,
            rendementKg1: record.rendementKg1,
            rendementKg2: record.rendementKg2,
            rendementCps1: record.rendementCps1,
            rendementKg3: record.rendementKg3,
            rendementCps2: record.rendementCps2,
            rendementTotal: record.rendementTotal,
            statutLibere: record.statutLibere,
            dateFinFabrication: record.dateFinFabrication,
            verificateurNom: record.verificateurNom,
            dateEnvoi: record.dateEnvoi,
            dateReceptionRectif: record.dateReceptionRectif,
            dateEnvoiApresRectif: record.dateEnvoiApresRectif,
            aql: record.aql,
            dateFinCNDT: record.dateFinCNDT,
            test3: record.test3,
            test4: record.test4,
            workflowStatus: (record.validiteOF ?? '').toLowerCase().includes('clotur') ? 'CLOTURE' : 'CREATION',
            createdById: req.user!.sub,
          },
        });
        created.push(of.id);
        imported++;
      } catch (e: any) {
        errors.push({ ligne: r, message: e?.message ?? 'Erreur insertion' });
      }
    }

    await recordAudit({
      action: 'IMPORT',
      entity: 'OrdreFabrication',
      reason: `Import Excel : ${imported} cree(s), ${errors.length} erreur(s)`,
      actor: actorFromReq(req),
      newValue: { imported, errors: errors.length },
      ipAddress: clientIp(req),
    });

    void headerRow;
    res.json({ imported, errors });
  } catch (err) {
    next(err);
  }
});
