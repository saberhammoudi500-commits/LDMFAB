import { supabase } from './supabase';
import type { OrdreFabrication, Paginated, Role, UserRow } from './types';

// ─── Erreur utilitaire ─────────────────────────────────────────
export function dbError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return (err as any).message;
  return 'Erreur inattendue.';
}

// ─── Audit ─────────────────────────────────────────────────────
export async function writeAudit(params: {
  action: string;
  entity: string;
  entityId?: string;
  reason?: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profile = await getProfile(user.id);
  const { error } = await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_label: profile ? `${profile.matricule} - ${profile.first_name} ${profile.last_name}` : user.email,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId,
    reason: params.reason,
    old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
    new_value: params.newValue ? JSON.stringify(params.newValue) : null,
  });
  if (error) console.error('[audit]', error.message);
}

// ─── Profiles ──────────────────────────────────────────────────
export async function getProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function getEmailByMatricule(matricule: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('email').eq('matricule', matricule).single();
  return data?.email ?? null;
}

// ─── Ordres de fabrication ─────────────────────────────────────
export async function fetchOrdres(params: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  aql?: string;
}): Promise<Paginated<OrdreFabrication>> {
  const { page, pageSize, search, status, aql } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('ordres_fabrication')
    .select('*, created_by:profiles!created_by_id(id,first_name,last_name), verifier:profiles!verifier_id(id,first_name,last_name)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) q = q.or(`code_produit.ilike.%${search}%,designation.ilike.%${search}%,numero_lot.ilike.%${search}%`);
  if (status) q = q.eq('workflow_status', status);
  if (aql) q = q.eq('aql', aql);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const mapped = (data ?? []).map(mapOF);
  const total = count ?? 0;
  return {
    data: mapped,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function fetchOrdreById(id: string): Promise<OrdreFabrication | null> {
  const { data, error } = await supabase
    .from('ordres_fabrication')
    .select('*, created_by:profiles!created_by_id(id,first_name,last_name), verifier:profiles!verifier_id(id,first_name,last_name), signatures:electronic_signatures(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return mapOF(data);
}

export async function createOrdre(payload: Partial<OrdreFabrication>) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('ordres_fabrication').insert({ ...toSnake(payload), created_by_id: user?.id }).select().single();
  if (error) throw new Error(error.message);
  await writeAudit({ action: 'CREATE', entity: 'OrdreFabrication', entityId: data.id, newValue: payload });
  return mapOF(data);
}

export async function updateOrdre(id: string, payload: Partial<OrdreFabrication>, reason?: string) {
  const old = await fetchOrdreById(id);
  const { data, error } = await supabase.from('ordres_fabrication').update(toSnake(payload)).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  await writeAudit({ action: 'UPDATE', entity: 'OrdreFabrication', entityId: id, reason, oldValue: old, newValue: payload });
  return mapOF(data);
}

export async function softDeleteOrdre(id: string, reason: string) {
  const { error } = await supabase.from('ordres_fabrication').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  await writeAudit({ action: 'DELETE', entity: 'OrdreFabrication', entityId: id, reason });
}

// ─── Signatures électroniques ───────────────────────────────────
export async function signOrdre(params: { entityId: string; meaning: string; reason: string; password: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Non authentifié');

  // Re-authentification (21 CFR Part 11)
  const { error: reAuthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: params.password });
  if (reAuthErr) throw new Error('Mot de passe incorrect — signature refusée.');

  const profile = await getProfile(user.id);
  const { error } = await supabase.from('electronic_signatures').insert({
    user_id: user.id,
    user_label: profile ? `${profile.matricule} - ${profile.first_name} ${profile.last_name}` : user.email,
    entity: 'OrdreFabrication',
    entity_id: params.entityId,
    meaning: params.meaning,
    reason: params.reason,
  });
  if (error) throw new Error(error.message);
  await writeAudit({ action: 'SIGN', entity: 'OrdreFabrication', entityId: params.entityId, reason: params.reason });
}

// ─── Utilisateurs ──────────────────────────────────────────────
export async function fetchUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, user_roles(role_id, roles(id,name))')
    .is('deleted_at', null)
    .order('last_name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((u: any) => ({
    id: u.id,
    matricule: u.matricule,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    service: u.service,
    isActive: u.is_active,
    lastLoginAt: u.last_login_at,
    lockedUntil: u.locked_until,
    roles: (u.user_roles ?? []).map((ur: any) => ({ id: ur.roles?.id, name: ur.roles?.name })),
  }));
}

export async function createUser(payload: { email: string; matricule: string; firstName: string; lastName: string; service?: string; password: string; roleIds: string[] }) {
  // Création via Supabase Auth admin n'est pas possible côté client.
  // On utilise une fonction RPC côté Supabase (edge function ou trigger).
  const { data, error } = await supabase.rpc('create_user_with_role', {
    p_email: payload.email,
    p_matricule: payload.matricule,
    p_first_name: payload.firstName,
    p_last_name: payload.lastName,
    p_service: payload.service ?? null,
    p_password: payload.password,
    p_role_ids: payload.roleIds,
  });
  if (error) throw new Error(error.message);
  await writeAudit({ action: 'CREATE', entity: 'User', entityId: data, newValue: { email: payload.email, matricule: payload.matricule } });
  return data;
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) throw new Error(error.message);
  await writeAudit({ action: 'UPDATE', entity: 'User', entityId: userId, newValue: { isActive } });
}

// ─── Rôles ─────────────────────────────────────────────────────
export async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*, user_roles(count)')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.is_system,
    permissions: Array.isArray(r.permissions) ? r.permissions : JSON.parse(r.permissions ?? '[]'),
    userCount: r.user_roles?.[0]?.count ?? 0,
  }));
}

export async function updateRolePermissions(roleId: string, permissions: string[]) {
  const { error } = await supabase.from('roles').update({ permissions }).eq('id', roleId);
  if (error) throw new Error(error.message);
  await writeAudit({ action: 'UPDATE', entity: 'Role', entityId: roleId, newValue: { permissions } });
}

// ─── Audit logs ────────────────────────────────────────────────
export async function fetchAuditLogs(params: { page: number; pageSize: number; entity?: string; action?: string }) {
  const { page, pageSize, entity, action } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(from, to);

  if (entity) q = q.eq('entity', entity);
  if (action) q = q.eq('action', action);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return {
    data: data ?? [],
    pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
  };
}

// ─── Dashboard ─────────────────────────────────────────────────
export async function fetchDashboardStats() {
  const [total, clotures, enCours, nonConformes] = await Promise.all([
    supabase.from('ordres_fabrication').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('ordres_fabrication').select('id', { count: 'exact', head: true }).eq('workflow_status', 'CLOTURE').is('deleted_at', null),
    supabase.from('ordres_fabrication').select('id', { count: 'exact', head: true }).eq('workflow_status', 'EN_COURS').is('deleted_at', null),
    supabase.from('ordres_fabrication').select('id', { count: 'exact', head: true }).eq('aql', 'NON CONFORME').is('deleted_at', null),
  ]);

  const { data: rendements } = await supabase
    .from('ordres_fabrication')
    .select('rendement_total, code_produit, created_at')
    .is('deleted_at', null)
    .not('rendement_total', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    totalOrdres: total.count ?? 0,
    ordresClotures: clotures.count ?? 0,
    ordresEnCours: enCours.count ?? 0,
    nonConformes: nonConformes.count ?? 0,
    rendements: rendements ?? [],
  };
}

// ─── Import Excel ───────────────────────────────────────────────
export async function importOrdres(rows: Partial<OrdreFabrication>[]): Promise<{ imported: number; errors: string[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  const errors: string[] = [];
  let imported = 0;

  for (const row of rows) {
    const { error } = await supabase.from('ordres_fabrication').insert({ ...toSnake(row), created_by_id: user?.id });
    if (error) errors.push(`Lot ${row.numeroLot}: ${error.message}`);
    else imported++;
  }

  if (imported > 0) await writeAudit({ action: 'IMPORT', entity: 'OrdreFabrication', newValue: { imported } });
  return { imported, errors };
}

// ─── Helpers de mapping ────────────────────────────────────────
function mapOF(r: any): OrdreFabrication {
  const qKg = r.quantite_kg ?? null;
  const qTh = r.quantite_theorique_kg ?? null;
  const rendTotal = r.rendement_total ?? (qKg && qTh && qTh > 0 ? (qKg / qTh) * 100 : null);
  return {
    id: r.id,
    dateDeclarationSF: r.date_declaration_sf,
    receptionOF: r.reception_of,
    finValiditeOF: r.fin_validite_of,
    validiteOF: r.validite_of,
    cndt: r.cndt,
    codeProduit: r.code_produit,
    designation: r.designation,
    numeroLot: r.numero_lot,
    dateFinPesee: r.date_fin_pesee,
    dateFinGranulation: r.date_fin_granulation,
    dateFinMelange: r.date_fin_melange,
    dateFinCompRemp: r.date_fin_comp_remp,
    dateFinPelliculage: r.date_fin_pelliculage,
    quantiteKg: qKg,
    quantiteFabriqueeCps: r.quantite_fabriquee_cps,
    quantiteTheoriqueKg: qTh,
    rendementKg1: r.rendement_kg1,
    rendementKg2: r.rendement_kg2,
    rendementCps1: r.rendement_cps1,
    rendementKg3: r.rendement_kg3,
    rendementCps2: r.rendement_cps2,
    rendementTotal: rendTotal,
    statutLibere: r.statut_libere,
    dateFinFabrication: r.date_fin_fabrication,
    verificateurNom: r.verificateur_nom,
    verifierId: r.verifier_id,
    dateEnvoi: r.date_envoi,
    dateReceptionRectif: r.date_reception_rectif,
    dateEnvoiApresRectif: r.date_envoi_apres_rectif,
    aql: r.aql,
    dateFinCNDT: r.date_fin_cndt,
    test3: r.test3,
    test4: r.test4,
    workflowStatus: r.workflow_status,
    workflowLabel: WORKFLOW_LABELS[r.workflow_status] ?? r.workflow_status,
    rendementHorsSeuil: rendTotal !== null && rendTotal < 95,
    createdBy: r.created_by ? { id: r.created_by.id, name: `${r.created_by.first_name} ${r.created_by.last_name}` } : null,
    verifier: r.verifier ? { id: r.verifier.id, name: `${r.verifier.first_name} ${r.verifier.last_name}` } : null,
    signatures: (r.signatures ?? []).map((s: any) => ({
      id: s.id,
      userLabel: s.user_label,
      meaning: s.meaning,
      reason: s.reason,
      signedAt: s.signed_at,
    })),
  };
}

const WORKFLOW_LABELS: Record<string, string> = {
  CREATION: 'Création',
  EN_COURS: 'En cours',
  FABRICATION_TERMINEE: 'Fabrication terminée',
  VERIFICATION: 'Vérification',
  RECTIFICATION: 'Rectification',
  CLOTURE: 'Clôturé',
};

function toSnake(obj: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    dateDeclarationSF: 'date_declaration_sf',
    receptionOF: 'reception_of',
    finValiditeOF: 'fin_validite_of',
    validiteOF: 'validite_of',
    cndt: 'cndt',
    codeProduit: 'code_produit',
    designation: 'designation',
    numeroLot: 'numero_lot',
    dateFinPesee: 'date_fin_pesee',
    dateFinGranulation: 'date_fin_granulation',
    dateFinMelange: 'date_fin_melange',
    dateFinCompRemp: 'date_fin_comp_remp',
    dateFinPelliculage: 'date_fin_pelliculage',
    quantiteKg: 'quantite_kg',
    quantiteFabriqueeCps: 'quantite_fabriquee_cps',
    quantiteTheoriqueKg: 'quantite_theorique_kg',
    rendementKg1: 'rendement_kg1',
    rendementKg2: 'rendement_kg2',
    rendementCps1: 'rendement_cps1',
    rendementKg3: 'rendement_kg3',
    rendementCps2: 'rendement_cps2',
    rendementTotal: 'rendement_total',
    statutLibere: 'statut_libere',
    dateFinFabrication: 'date_fin_fabrication',
    verificateurNom: 'verificateur_nom',
    verifierId: 'verifier_id',
    dateEnvoi: 'date_envoi',
    dateReceptionRectif: 'date_reception_rectif',
    dateEnvoiApresRectif: 'date_envoi_apres_rectif',
    aql: 'aql',
    dateFinCNDT: 'date_fin_cndt',
    test3: 'test3',
    test4: 'test4',
    workflowStatus: 'workflow_status',
  };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && map[k]) out[map[k]] = v;
  }
  return out;
}
