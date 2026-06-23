// ============================================================
//  Catalogue des permissions (RBAC) + roles preconfigures
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
  // Ordres de fabrication
  OF_READ: 'of:read',
  OF_CREATE: 'of:create',
  OF_UPDATE: 'of:update',
  OF_DELETE: 'of:delete',
  OF_VERIFY: 'of:verify',
  OF_VALIDATE: 'of:validate', // valider / cloturer
  OF_SIGN: 'of:sign', // signature electronique
  OF_IMPORT: 'of:import',
  OF_EXPORT: 'of:export',
  // Piste d'audit
  AUDIT_READ: 'audit:read',
  // Tableau de bord
  DASHBOARD_READ: 'dashboard:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

// Libelles lisibles (interface d'admin)
export const PERMISSION_LABELS: Record<string, string> = {
  'users:read': 'Consulter les utilisateurs',
  'users:create': 'Creer des utilisateurs',
  'users:update': 'Modifier des utilisateurs',
  'users:delete': 'Desactiver des utilisateurs',
  'roles:read': 'Consulter les roles',
  'roles:manage': 'Gerer les roles et permissions',
  'of:read': 'Consulter les ordres de fabrication',
  'of:create': 'Creer un ordre de fabrication',
  'of:update': 'Modifier un ordre de fabrication',
  'of:delete': 'Supprimer un ordre de fabrication',
  'of:verify': 'Verifier un ordre de fabrication',
  'of:validate': 'Valider / cloturer un ordre de fabrication',
  'of:sign': 'Signer electroniquement',
  'of:import': 'Importer depuis Excel',
  'of:export': 'Exporter (Excel / PDF)',
  'audit:read': "Consulter la piste d'audit",
  'dashboard:read': 'Acceder au tableau de bord',
};

// Roles systeme preconfigures (crees par le seed)
export const SYSTEM_ROLES: Array<{
  name: string;
  description: string;
  permissions: Permission[];
}> = [
  {
    name: 'Administrateur',
    description: 'Acces complet : utilisateurs, roles, parametres et donnees.',
    permissions: ALL_PERMISSIONS,
  },
  {
    name: 'Responsable Fabrication',
    description: 'Cree, modifie, valide et cloture les ordres de fabrication.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ,
      PERMISSIONS.OF_CREATE,
      PERMISSIONS.OF_UPDATE,
      PERMISSIONS.OF_VALIDATE,
      PERMISSIONS.OF_SIGN,
      PERMISSIONS.OF_IMPORT,
      PERMISSIONS.OF_EXPORT,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.USERS_READ,
    ],
  },
  {
    name: 'Operateur',
    description: 'Saisit les etapes de fabrication sur les ordres en cours.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ,
      PERMISSIONS.OF_CREATE,
      PERMISSIONS.OF_UPDATE,
    ],
  },
  {
    name: 'Verificateur AQ',
    description: "Verifie, controle la conformite (AQL) et signe les ordres.",
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ,
      PERMISSIONS.OF_VERIFY,
      PERMISSIONS.OF_SIGN,
      PERMISSIONS.OF_EXPORT,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    name: 'Consultation',
    description: 'Lecture seule et export des donnees.',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.OF_READ,
      PERMISSIONS.OF_EXPORT,
    ],
  },
];
