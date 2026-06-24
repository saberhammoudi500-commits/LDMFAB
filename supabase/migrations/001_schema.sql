-- ============================================================
--  LDMFAB - Schema Supabase
--  21 CFR Part 11 : audit trail, RLS, signatures electroniques
-- ============================================================

-- ── Profiles utilisateurs (lié à auth.users) ────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  matricule     text unique not null,
  email         text unique not null,
  first_name    text not null,
  last_name     text not null,
  service       text,
  is_active     boolean default true,
  must_change_password boolean default true,
  password_changed_at  timestamptz default now(),
  last_login_at timestamptz,
  locked_until  timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "profiles_sel" on public.profiles for select to authenticated using (true);
create policy "profiles_ins" on public.profiles for insert to authenticated with check (true);
create policy "profiles_upd" on public.profiles for update to authenticated using (true);
create policy "profiles_del" on public.profiles for delete to authenticated using (true);

-- ── Rôles ────────────────────────────────────────────────────
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  permissions jsonb default '[]',
  is_system   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.roles enable row level security;
create policy "roles_sel" on public.roles for select to authenticated using (true);
create policy "roles_ins" on public.roles for insert to authenticated with check (true);
create policy "roles_upd" on public.roles for update to authenticated using (true);
create policy "roles_del" on public.roles for delete to authenticated using (true);

-- ── User → Roles ─────────────────────────────────────────────
create table if not exists public.user_roles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role_id      uuid not null references public.roles(id) on delete cascade,
  assigned_at  timestamptz default now(),
  unique(user_id, role_id)
);

alter table public.user_roles enable row level security;
create policy "user_roles_sel" on public.user_roles for select to authenticated using (true);
create policy "user_roles_ins" on public.user_roles for insert to authenticated with check (true);
create policy "user_roles_upd" on public.user_roles for update to authenticated using (true);
create policy "user_roles_del" on public.user_roles for delete to authenticated using (true);

-- ── Ordres de fabrication ────────────────────────────────────
create table if not exists public.ordres_fabrication (
  id                    uuid primary key default gen_random_uuid(),
  date_declaration_sf   date,
  reception_of          date,
  fin_validite_of       date,
  validite_of           text,
  cndt                  text,
  code_produit          text not null,
  designation           text not null,
  numero_lot            text not null,
  date_fin_pesee        date,
  date_fin_granulation  date,
  date_fin_melange      date,
  date_fin_comp_remp    date,
  date_fin_pelliculage  date,
  quantite_kg           numeric,
  quantite_fabriquee_cps numeric,
  quantite_theorique_kg numeric,
  rendement_kg1         numeric,
  rendement_kg2         numeric,
  rendement_cps1        numeric,
  rendement_kg3         numeric,
  rendement_cps2        numeric,
  rendement_total       numeric,
  statut_libere         text,
  date_fin_fabrication  date,
  verificateur_nom      text,
  verifier_id           uuid references public.profiles(id),
  date_envoi            date,
  date_reception_rectif date,
  date_envoi_apres_rectif date,
  aql                   text,
  date_fin_cndt         date,
  test3                 text,
  test4                 text,
  workflow_status       text default 'CREATION',
  created_by_id         uuid references public.profiles(id),
  deleted_at            timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_of_code_produit on public.ordres_fabrication(code_produit);
create index if not exists idx_of_numero_lot   on public.ordres_fabrication(numero_lot);
create index if not exists idx_of_workflow     on public.ordres_fabrication(workflow_status);

alter table public.ordres_fabrication enable row level security;
create policy "of_sel" on public.ordres_fabrication for select to authenticated using (true);
create policy "of_ins" on public.ordres_fabrication for insert to authenticated with check (true);
create policy "of_upd" on public.ordres_fabrication for update to authenticated using (true);
create policy "of_del" on public.ordres_fabrication for delete to authenticated using (true);

-- ── Signatures électroniques (21 CFR Part 11) ────────────────
create table if not exists public.electronic_signatures (
  id          uuid primary key default gen_random_uuid(),
  signed_at   timestamptz default now(),
  user_id     uuid not null references public.profiles(id),
  user_label  text not null,
  entity      text not null,
  entity_id   uuid not null,
  meaning     text not null,
  reason      text not null
);

create index if not exists idx_sig_entity on public.electronic_signatures(entity, entity_id);

alter table public.electronic_signatures enable row level security;
create policy "sig_sel" on public.electronic_signatures for select to authenticated using (true);
create policy "sig_ins" on public.electronic_signatures for insert to authenticated with check (true);

-- ── Audit trail (immuable) ────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  timestamp   timestamptz default now(),
  user_id     uuid references public.profiles(id),
  user_label  text,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  reason      text,
  old_value   jsonb,
  new_value   jsonb
);

create index if not exists idx_audit_entity    on public.audit_logs(entity, entity_id);
create index if not exists idx_audit_timestamp on public.audit_logs(timestamp);

alter table public.audit_logs enable row level security;
create policy "audit_sel" on public.audit_logs for select to authenticated using (true);
create policy "audit_ins" on public.audit_logs for insert to authenticated with check (true);
-- Pas de UPDATE ni DELETE : piste immuable
