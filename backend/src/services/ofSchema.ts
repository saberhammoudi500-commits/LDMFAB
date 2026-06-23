import { z } from 'zod';
import { computeRendementTotal, isRendementHorsSeuil } from '../utils/yield';

// Accepte une date ISO (string), null, ou chaine vide -> Date | null
const dateField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  });

const numField = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  });

export const WORKFLOW_STATUSES = [
  'CREATION',
  'EN_COURS',
  'FABRICATION_TERMINEE',
  'VERIFICATION',
  'RECTIFICATION',
  'CLOTURE',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

// Transitions autorisees du workflow
export const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  CREATION: ['EN_COURS'],
  EN_COURS: ['FABRICATION_TERMINEE'],
  FABRICATION_TERMINEE: ['VERIFICATION'],
  VERIFICATION: ['RECTIFICATION', 'CLOTURE'],
  RECTIFICATION: ['VERIFICATION'],
  CLOTURE: [],
};

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  CREATION: 'Creation',
  EN_COURS: 'En cours',
  FABRICATION_TERMINEE: 'Fabrication terminee',
  VERIFICATION: 'Verification',
  RECTIFICATION: 'Rectification',
  CLOTURE: 'Cloture',
};

export const ofInputSchema = z.object({
  dateDeclarationSF: dateField,
  receptionOF: dateField,
  finValiditeOF: dateField,
  validiteOF: z.string().nullable().optional(),
  cndt: z.string().nullable().optional(),
  codeProduit: z.string().min(1, 'Code produit requis.'),
  designation: z.string().min(1, 'Designation requise.'),
  numeroLot: z.string().min(1, 'N de lot requis.'),

  dateFinPesee: dateField,
  dateFinGranulation: dateField,
  dateFinMelange: dateField,
  dateFinCompRemp: dateField,
  dateFinPelliculage: dateField,

  quantiteKg: numField,
  quantiteFabriqueeCps: numField,
  quantiteTheoriqueKg: numField,

  rendementKg1: numField,
  rendementKg2: numField,
  rendementCps1: numField,
  rendementKg3: numField,
  rendementCps2: numField,

  statutLibere: z.string().nullable().optional(),
  dateFinFabrication: dateField,
  verificateurNom: z.string().nullable().optional(),
  verifierId: z.string().nullable().optional(),
  dateEnvoi: dateField,
  dateReceptionRectif: dateField,
  dateEnvoiApresRectif: dateField,
  aql: z.string().nullable().optional(),
  dateFinCNDT: dateField,
  test3: z.string().nullable().optional(),
  test4: z.string().nullable().optional(),
});

export type OfInput = z.infer<typeof ofInputSchema>;

/** Enrichit les donnees avec le rendement total calcule. */
export function withComputedYield<T extends { quantiteKg?: number | null; quantiteTheoriqueKg?: number | null }>(
  data: T,
): T & { rendementTotal: number | null } {
  return {
    ...data,
    rendementTotal: computeRendementTotal(data.quantiteKg, data.quantiteTheoriqueKg),
  };
}

/** Serialise un OF pour l'API en ajoutant des indicateurs derives. */
export function serializeOf(of: any) {
  return {
    ...of,
    rendementHorsSeuil: isRendementHorsSeuil(of.rendementTotal),
    workflowLabel: WORKFLOW_LABELS[of.workflowStatus as WorkflowStatus] ?? of.workflowStatus,
    verifier: of.verifier
      ? { id: of.verifier.id, name: `${of.verifier.firstName} ${of.verifier.lastName}` }
      : null,
    createdBy: of.createdBy
      ? { id: of.createdBy.id, name: `${of.createdBy.firstName} ${of.createdBy.lastName}` }
      : null,
  };
}
