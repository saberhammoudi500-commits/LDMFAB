import { Router } from 'express';
import { authenticate } from '../middleware/auth';

export const metaRouter = Router();
metaRouter.use(authenticate);

const WORKFLOW_STATUSES = ['RECU', 'EN_COURS', 'SF_DECLARE', 'CONDITIONNE', 'CLOTURE'] as const;
const WORKFLOW_LABELS: Record<string, string> = {
  RECU: 'Recu',
  EN_COURS: 'En cours',
  SF_DECLARE: 'SF Declare',
  CONDITIONNE: 'Conditionne',
  CLOTURE: 'Cloture',
};
const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  RECU: ['EN_COURS'],
  EN_COURS: ['SF_DECLARE'],
  SF_DECLARE: ['CONDITIONNE'],
  CONDITIONNE: ['CLOTURE'],
  CLOTURE: [],
};

metaRouter.get('/', (_req, res) => {
  res.json({
    workflow: WORKFLOW_STATUSES.map((s) => ({
      value: s,
      label: WORKFLOW_LABELS[s],
      next: WORKFLOW_TRANSITIONS[s],
    })),
    phases: ['PESEE', 'GRANULATION', 'MELANGE', 'COMPRESSION', 'GELULE', 'PELLICULAGE', 'CREME'],
    ddlStatuts: ['A_EMETTRE', 'EMIS', 'EN_ATTENTE', 'EN_VERIFICATION', 'RECTIFICATION', 'VALIDE'],
    signatureMeanings: [
      { value: 'AUTHOR', label: 'Auteur / Realisation' },
      { value: 'REVIEWER', label: 'Verificateur' },
      { value: 'APPROVER', label: 'Approbateur / Liberation' },
    ],
  });
});
