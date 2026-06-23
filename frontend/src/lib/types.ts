export interface OrdreFabrication {
  id: string;
  dateDeclarationSF: string | null;
  receptionOF: string | null;
  finValiditeOF: string | null;
  validiteOF: string | null;
  cndt: string | null;
  codeProduit: string;
  designation: string;
  numeroLot: string;
  dateFinPesee: string | null;
  dateFinGranulation: string | null;
  dateFinMelange: string | null;
  dateFinCompRemp: string | null;
  dateFinPelliculage: string | null;
  quantiteKg: number | null;
  quantiteFabriqueeCps: number | null;
  quantiteTheoriqueKg: number | null;
  rendementKg1: number | null;
  rendementKg2: number | null;
  rendementCps1: number | null;
  rendementKg3: number | null;
  rendementCps2: number | null;
  rendementTotal: number | null;
  statutLibere: string | null;
  dateFinFabrication: string | null;
  verificateurNom: string | null;
  verifierId: string | null;
  dateEnvoi: string | null;
  dateReceptionRectif: string | null;
  dateEnvoiApresRectif: string | null;
  aql: string | null;
  dateFinCNDT: string | null;
  test3: string | null;
  test4: string | null;
  workflowStatus: string;
  workflowLabel: string;
  rendementHorsSeuil: boolean;
  createdBy?: { id: string; name: string } | null;
  verifier?: { id: string; name: string } | null;
  signatures?: Signature[];
}

export interface Signature {
  id: string;
  userLabel: string;
  meaning: string;
  reason: string;
  signedAt: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount?: number;
}

export interface UserRow {
  id: string;
  matricule: string;
  email: string;
  firstName: string;
  lastName: string;
  service: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  roles: { id: string; name: string }[];
}
