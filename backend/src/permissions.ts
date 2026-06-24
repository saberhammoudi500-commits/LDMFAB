// ============================================================
//  Catalogue des permissions (RBAC) - CDC-PROD-PHARMA-2026
// ============================================================

export const PERMISSIONS = {
  // Administration des utilisateurs
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  // Roles & responsabilites
  ROLES_READ: 'roles:read',
  ROLES_MANAGE: 'roles:manage',
  // M1 - Referentiels
  REF_READ: 'ref:read',
  REF_MANAGE: 'ref:manage',
  // M2 - Planification (PDP)
  PDP_READ: 'pdp:read',
  PDP_MANAGE: 'pdp:manage',
  // M3 - Ordres de fabrication
  OF_READ: 'of:read',
  OF_CREATE: 'of:create',
  OF_UPDATE: 'of:update',
  OF_DELETE: 'of:delete',
  OF_VERIFY: 'of:verify',
  OF_VALIDATE: 'of:validate',
  OF_SIGN: 'of:sign',
  OF_IMPORT: 'of:import',
  OF_EXPORT: 'of:export',
  // M4 - Phases fabrication
  PHASE_READ: 'phase:read',
  PHASE_SAISIE: 'phase:saisie',
  PHASE_VALIDATE: 'phase:validate',
  // M5 - Conditionnement
  CNDT_READ: 'cndt:read',
  CNDT_MANAGE: 'cndt:manage',
  // M7 - DDL
  DDL_READ: 'ddl:read',
  DDL_MANAGE: 'ddl:manage',
  DDL_VERIFY: 'ddl:verify',
  // M9 - Effectifs
  HC_READ: 'hc:read',
  HC_MANAGE: 'hc:manage',
  // M10 - Valorisation / CA
  CA_READ: 'ca:read',
  // Piste d'audit
  AUDIT_READ: 'audit:read',
  // Tableau de bord
  DASHBOARD_READ: 'dashboard:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<string, string> = {
  'users:read': 'Consulter les utilisateurs',
  'users:create': 'Creer des utilisateurs',
  'users:update': 'Modifier des utilisateurs',
  'users:delete': 'Desactiver des utilisateurs',
  'roles:read': 'Consulter les roles',
  'roles:manage': 'Gerer les roles et permissions',
  'ref:read': 'Consulter les referentiels',
  'ref:manage': 'Gerer les referentiels (produits, equipements, cadences)',
  'pdp:read': 'Consulter le plan directeur de production',
  'pdp:manage': 'Saisir et modifier le PDP',
  'of:read': 'Consulter les ordres de fabrication',
  'of:create': 'Creer un ordre de fabrication',
  'of:update': 'Modifier un ordre de fabrication',
  'of:delete': 'Supprimer un ordre de fabrication',
  'of:verify': 'Verifier un ordre de fabrication',
  'of:validate': 'Valider / cloturer un ordre de fabrication',
  'of:sign': 'Signer electroniquement',
  'of:import': 'Importer depuis Excel',
  'of:export': 'Exporter (Excel / PDF)',
  'phase:read': 'Consulter les phases de fabrication',
  'phase:saisie': 'Saisir les phases de fabrication',
  'phase:validate': 'Valider les phases de fabrication',
  'cndt:read': 'Consulter le conditionnement',
  'cndt:manage': 'Gerer le conditionnement',
  'ddl:read': 'Consulter les dossiers de lot',
  'ddl:manage': 'Gerer les dossiers de lot',
  'ddl:verify': 'Verifier les dossiers de lot',
  'hc:read': 'Consulter les effectifs',
  'hc:manage': 'Gerer les effectifs',
  'ca:read': 'Consulter la valorisation / CA',
  'audit:read': "Consulter la piste d'audit",
  'dashboard:read': 'Acceder au tableau de bord',
};

export const SYSTEM_ROLES: Array<{
  name: string;
  description: string;
  permissions: Permission[];
}> = [
  {
    name: 'Administrateur',
    description: 'Acces complet a tous les modules.',
    permissions: ALL_PERMISSIONS,
  },
  {
    name: 'Direction Production',
    description: 'Consultation globale, tableaux de bord, arbitrages.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ, PERMISSIONS.OF_EXPORT, PERMISSIONS.OF_SIGN, PERMISSIONS.OF_VALIDATE,
      PERMISSIONS.REF_READ,
      PERMISSIONS.PDP_READ,
      PERMISSIONS.PHASE_READ,
      PERMISSIONS.CNDT_READ,
      PERMISSIONS.DDL_READ,
      PERMISSIONS.HC_READ,
      PERMISSIONS.CA_READ,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.USERS_READ,
    ],
  },
  {
    name: 'Responsable Planification',
    description: 'Elabore et met a jour le PDP, ordonnancement.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.PDP_READ, PERMISSIONS.PDP_MANAGE,
      PERMISSIONS.REF_READ,
      PERMISSIONS.OF_READ,
      PERMISSIONS.CA_READ,
    ],
  },
  {
    name: 'Chef Atelier',
    description: 'Suivi de fabrication par phase et atelier.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ, PERMISSIONS.OF_UPDATE,
      PERMISSIONS.REF_READ,
      PERMISSIONS.PHASE_READ, PERMISSIONS.PHASE_SAISIE, PERMISSIONS.PHASE_VALIDATE,
      PERMISSIONS.CNDT_READ,
      PERMISSIONS.DDL_READ,
    ],
  },
  {
    name: 'Operateur',
    description: 'Saisie atelier (phases, quantites).',
    permissions: [
      PERMISSIONS.OF_READ,
      PERMISSIONS.PHASE_READ, PERMISSIONS.PHASE_SAISIE,
      PERMISSIONS.CNDT_READ,
    ],
  },
  {
    name: 'Responsable Conditionnement',
    description: 'Planning lignes, declarations de conditionnement, en-cours.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ,
      PERMISSIONS.REF_READ,
      PERMISSIONS.PHASE_READ,
      PERMISSIONS.CNDT_READ, PERMISSIONS.CNDT_MANAGE,
      PERMISSIONS.DDL_READ,
    ],
  },
  {
    name: 'Assurance Qualite',
    description: 'DDL, conformite, piste d\'audit, libération.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ, PERMISSIONS.OF_VERIFY, PERMISSIONS.OF_SIGN,
      PERMISSIONS.REF_READ,
      PERMISSIONS.PHASE_READ,
      PERMISSIONS.CNDT_READ,
      PERMISSIONS.DDL_READ, PERMISSIONS.DDL_MANAGE, PERMISSIONS.DDL_VERIFY,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    name: 'Verificateur DDL',
    description: 'Traitement du circuit documentaire des dossiers de lot.',
    permissions: [
      PERMISSIONS.OF_READ,
      PERMISSIONS.PHASE_READ,
      PERMISSIONS.CNDT_READ,
      PERMISSIONS.DDL_READ, PERMISSIONS.DDL_VERIFY,
    ],
  },
  {
    name: 'Controle de Gestion',
    description: 'Valorisation, CA, analyse des ecarts.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ, PERMISSIONS.OF_EXPORT,
      PERMISSIONS.REF_READ,
      PERMISSIONS.PDP_READ,
      PERMISSIONS.CA_READ,
    ],
  },
  {
    name: 'Consultation',
    description: 'Lecture seule et export.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ, PERMISSIONS.OF_EXPORT,
      PERMISSIONS.REF_READ,
      PERMISSIONS.PDP_READ,
    ],
  },
];
