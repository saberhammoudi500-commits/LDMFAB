-- ============================================================
-- 002 — Ordres de fabrication, Phases, Conditionnement, DDL,
--        Prolongation
-- ============================================================

create table if not exists public.ordre_fabrication (
  id                    uuid primary key default gen_random_uuid(),
  numero_of             text not null unique,
  produit_id            uuid not null references public.produit(id),
  numero_lot            text not null,
  reception_of          date,
  fin_validite_of       date,
  taille_lot            numeric,
  qte_theorique         int,
  workflow_status       text not null default 'RECU',
  date_declaration_sf   date,
  qte_sf                numeric,
  created_by            uuid references auth.users(id),
  deleted_at            timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create table if not exists public.phase_realisation (
  id              uuid primary key default gen_random_uuid(),
  of_id           uuid not null references public.ordre_fabrication(id),
  phase           text not null,
  equipement_id   uuid references public.equipement(id),
  operateur_id    uuid references auth.users(id),
  superviseur_id  uuid references auth.users(id),
  date_debut      date,
  date_fin        date,
  qte_entree_kg   numeric,
  qte_sortie_kg   numeric,
  rendement_kg    numeric,
  statut          text default 'EN_COURS',
  observations    text,
  created_at      timestamptz default now(),
  unique (of_id, phase)
);

create table if not exists public.conditionnement (
  id                uuid primary key default gen_random_uuid(),
  of_id             uuid not null unique references public.ordre_fabrication(id),
  equipement_id     uuid references public.equipement(id),
  operateur_id      uuid references auth.users(id),
  superviseur_id    uuid references auth.users(id),
  statut            text default 'A_PLANIFIER',
  qte_fabrique      int,
  qte_cndt          int,
  qte_restante      int,
  taux_cndt         numeric,
  date_debut_cndt   date,
  date_fin_cndt     date,
  created_at        timestamptz default now()
);

create table if not exists public.dossier_lot (
  id                  uuid primary key default gen_random_uuid(),
  of_id               uuid not null unique references public.ordre_fabrication(id),
  verificateur_id     uuid references auth.users(id),
  statut              text not null default 'A_EMETTRE',
  date_emission       date,
  date_envoi          date,
  date_verification   date,
  date_validation     date,
  observation         text,
  created_at          timestamptz default now()
);

create table if not exists public.prolongation_of (
  id            uuid primary key default gen_random_uuid(),
  of_id         uuid not null references public.ordre_fabrication(id),
  demande_par   uuid references auth.users(id),
  motif         text,
  nouvelle_date date,
  statut        text default 'EN_ATTENTE',
  created_at    timestamptz default now()
);

-- RLS
alter table public.ordre_fabrication  enable row level security;
alter table public.phase_realisation  enable row level security;
alter table public.conditionnement    enable row level security;
alter table public.dossier_lot        enable row level security;
alter table public.prolongation_of    enable row level security;

do $$ declare t text;
begin
  foreach t in array array[
    'ordre_fabrication','phase_realisation','conditionnement',
    'dossier_lot','prolongation_of'
  ] loop
    execute format('create policy "sel" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "ins" on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy "upd" on public.%I for update to authenticated using (true)', t);
    execute format('create policy "del" on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;
