import { Router } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../prisma';
import { authenticate, actorFromReq } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { PERMISSIONS } from '../permissions';
import { recordAudit, clientIp } from '../utils/audit';

export const importExportRouter = Router();
importExportRouter.use(authenticate);

// Export des OF avec leurs phases et conditionnement
importExportRouter.get('/export', requirePermission(PERMISSIONS.OF_EXPORT), async (req, res, next) => {
  try {
    const rows = await prisma.ordreFabrication.findMany({
      where: { deletedAt: null },
      include: {
        produit: { include: { donneurOrdre: true, formeGalenique: true } },
        phasesRealisation: true,
        conditionnement: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'LDMFAB';
    const ws = wb.addWorksheet('OF');

    ws.columns = [
      { header: 'N° OF', key: 'numeroOF', width: 18 },
      { header: 'N° Lot', key: 'numeroLot', width: 15 },
      { header: 'Code Produit', key: 'codePF', width: 15 },
      { header: 'Désignation', key: 'designation', width: 40 },
      { header: 'Donneur d\'ordre', key: 'donneurOrdre', width: 18 },
      { header: 'Forme', key: 'forme', width: 12 },
      { header: 'Statut OF', key: 'workflowStatus', width: 15 },
      { header: 'Réception OF', key: 'receptionOF', width: 14 },
      { header: 'Fin validité OF', key: 'finValiditeOF', width: 14 },
      { header: 'Taille lot (kg)', key: 'tailleLoT', width: 14 },
      { header: 'Qté théorique', key: 'qteTheorique', width: 14 },
      { header: 'Qté SF (kg)', key: 'qteSF', width: 12 },
      { header: 'Date SF', key: 'dateDeclarationSF', width: 14 },
      { header: 'Qté Cndt', key: 'qteCndt', width: 12 },
      { header: 'Taux Cndt (%)', key: 'tauxCndt', width: 14 },
      { header: 'Statut Cndt', key: 'statutCndt', width: 14 },
    ];

    const hrow = ws.getRow(1);
    hrow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hrow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    for (const of_ of rows) {
      ws.addRow({
        numeroOF: of_.numeroOF,
        numeroLot: of_.numeroLot,
        codePF: of_.produit.codePF,
        designation: of_.produit.designation,
        donneurOrdre: of_.produit.donneurOrdre.nom,
        forme: of_.produit.formeGalenique.nom,
        workflowStatus: of_.workflowStatus,
        receptionOF: of_.receptionOF ? new Date(of_.receptionOF).toLocaleDateString('fr-FR') : '',
        finValiditeOF: of_.finValiditeOF ? new Date(of_.finValiditeOF).toLocaleDateString('fr-FR') : '',
        tailleLoT: of_.tailleLoT,
        qteTheorique: of_.qteTheorique,
        qteSF: of_.qteSF,
        dateDeclarationSF: of_.dateDeclarationSF ? new Date(of_.dateDeclarationSF).toLocaleDateString('fr-FR') : '',
        qteCndt: of_.conditionnement?.qteCndt ?? '',
        tauxCndt: of_.conditionnement?.tauxCndt?.toFixed(2) ?? '',
        statutCndt: of_.conditionnement?.statut ?? '',
      });
    }

    await recordAudit({
      action: 'EXPORT',
      entity: 'OrdreFabrication',
      reason: `Export Excel de ${rows.length} ordres`,
      actor: actorFromReq(req),
      ipAddress: clientIp(req),
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ldmfab-of-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});
