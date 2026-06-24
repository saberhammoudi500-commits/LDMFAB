-- ============================================================
-- 001 — Référentiels : DonneurOrdre, FormeGalenique, Produit,
--        Equipement, Cadence, PhaseStandard, Pcsu
-- ============================================================

create table if not exists public.donneur_ordre (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  nom         text not null,
  created_at  timestamptz default now()
);

create table if not exists public.forme_galenique (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  nom         text not null,
  created_at  timestamptz default now()
);

create table if not exists public.produit (
  id                   uuid primary key default gen_random_uuid(),
  code_pf              text not null unique,
  designation          text not null,
  donneur_ordre_id     uuid not null references public.donneur_ordre(id),
  forme_galenique_id   uuid not null references public.forme_galenique(id),
  activite             text,
  nb_unites_par_boite  int,
  taille_standard_lot  numeric,
  duree_vie            int,
  aql                  text,
  created_at           timestamptz default now()
);

create table if not exists public.equipement (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  nom         text not null,
  atelier     text,
  type        text,
  actif       boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.cadence (
  id              uuid primary key default gen_random_uuid(),
  produit_id      uuid not null references public.produit(id),
  equipement_id   uuid references public.equipement(id),
  phase           text not null,
  cadence_kg_h    numeric,
  created_at      timestamptz default now()
);

create table if not exists public.phase_standard (
  id              uuid primary key default gen_random_uuid(),
  produit_id      uuid not null references public.produit(id),
  phase           text not null,
  duree_heures    numeric,
  rendement_cible numeric,
  created_at      timestamptz default now()
);

create table if not exists public.pcsu (
  id              uuid primary key default gen_random_uuid(),
  produit_id      uuid not null references public.produit(id),
  annee           int not null,
  prix_unitaire   numeric not null,
  created_at      timestamptz default now(),
  unique (produit_id, annee)
);

-- RLS
alter table public.donneur_ordre     enable row level security;
alter table public.forme_galenique   enable row level security;
alter table public.produit           enable row level security;
alter table public.equipement        enable row level security;
alter table public.cadence           enable row level security;
alter table public.phase_standard    enable row level security;
alter table public.pcsu              enable row level security;

-- Policies : accès complet aux utilisateurs authentifiés
do $$ declare t text;
begin
  foreach t in array array[
    'donneur_ordre','forme_galenique','produit',
    'equipement','cadence','phase_standard','pcsu'
  ] loop
    execute format('create policy "sel" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "ins" on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy "upd" on public.%I for update to authenticated using (true)', t);
    execute format('create policy "del" on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;
