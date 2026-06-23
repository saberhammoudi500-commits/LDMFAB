import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { WORKFLOW_STATUSES, WORKFLOW_LABELS, WORKFLOW_TRANSITIONS } from '../services/ofSchema';

export const metaRouter = Router();
metaRouter.use(authenticate);

// Metadonnees pour l'interface (libelles workflow, transitions)
metaRouter.get('/', (_req, res) => {
  res.json({
    workflow: WORKFLOW_STATUSES.map((s) => ({
      value: s,
      label: WORKFLOW_LABELS[s],
      next: WORKFLOW_TRANSITIONS[s],
    })),
    aqlOptions: ['CONFORME', 'NON CONFORME', 'EN ATTENTE'],
    signatureMeanings: [
      { value: 'AUTHOR', label: 'Auteur / Realisation' },
      { value: 'REVIEWER', label: 'Verificateur' },
      { value: 'APPROVER', label: 'Approbateur / Liberation' },
    ],
  });
});
