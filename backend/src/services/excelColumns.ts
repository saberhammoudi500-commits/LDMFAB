// Definition des colonnes Excel (ordre = modele fourni) et mapping
// vers les champs de OrdreFabrication.

export type ColType = 'date' | 'number' | 'text';

export interface ExcelColumn {
  header: string;
  field: string;
  type: ColType;
}

export const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: 'Date Declaration SF', field: 'dateDeclarationSF', type: 'date' },
  { header: 'Reception OF', field: 'receptionOF', type: 'date' },
  { header: 'Fin validite OF', field: 'finValiditeOF', type: 'date' },
  { header: 'Validite OF', field: 'validiteOF', type: 'text' },
  { header: 'CNDT', field: 'cndt', type: 'text' },
  { header: 'CODE PRODUIT', field: 'codeProduit', type: 'text' },
  { header: 'DESIGNATION', field: 'designation', type: 'text' },
  { header: 'N LOT', field: 'numeroLot', type: 'text' },
  { header: 'date fin pesee', field: 'dateFinPesee', type: 'date' },
  { header: 'date fin granulation', field: 'dateFinGranulation', type: 'date' },
  { header: 'date fin melange', field: 'dateFinMelange', type: 'date' },
  { header: 'Date fin comp/remp', field: 'dateFinCompRemp', type: 'date' },
  { header: 'date fin pelli', field: 'dateFinPelliculage', type: 'date' },
  { header: 'quantite (kg)', field: 'quantiteKg', type: 'number' },
  { header: 'quantite fabriquee (cps)', field: 'quantiteFabriqueeCps', type: 'number' },
  { header: 'Y % (kg)', field: 'rendementKg1', type: 'number' },
  { header: 'Y % (kg) 2', field: 'rendementKg2', type: 'number' },
  { header: 'Y % CPS', field: 'rendementCps1', type: 'number' },
  { header: 'Y % (kg) 3', field: 'rendementKg3', type: 'number' },
  { header: 'Y % CPS 2', field: 'rendementCps2', type: 'number' },
  { header: 'STATUT', field: 'statutLibere', type: 'text' },
  { header: 'date de fin fabrication', field: 'dateFinFabrication', type: 'date' },
  { header: 'verificateur', field: 'verificateurNom', type: 'text' },
  { header: "date d'envoi", field: 'dateEnvoi', type: 'date' },
  { header: 'date reception pour rectif', field: 'dateReceptionRectif', type: 'date' },
  { header: "Date d'envoi apres rectification", field: 'dateEnvoiApresRectif', type: 'date' },
  { header: 'Quantite Theorique', field: 'quantiteTheoriqueKg', type: 'number' },
  { header: 'Rendement Total', field: 'rendementTotal', type: 'number' },
  { header: 'AQL', field: 'aql', type: 'text' },
  { header: 'Date Fin CNDT', field: 'dateFinCNDT', type: 'date' },
  { header: 'TEST3', field: 'test3', type: 'text' },
  { header: 'TEST4', field: 'test4', type: 'text' },
];
