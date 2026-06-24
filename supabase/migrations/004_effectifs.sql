-- ============================================================
-- 004 — Effectifs (HC) et Budget postes
-- ============================================================

create table if not exists public.employe (
  id            uuid primary key default gen_random_uuid(),
  matricule     text not null unique,
  nom           text not null,
  prenom        text not null,
  type_contrat  text not null default 'CDI',
  grade         text not null default 'G1',
  fonction      text,
  service       text,
  manager_id    uuid references public.employe(id),
  actif         boolean default true,
  deleted_at    timestamptz,
  created_at    timestamptz default now()
);

create table if not exists public.budget_poste (
  id          uuid primary key default gen_random_uuid(),
  annee       int not null,
  service     text not null,
  grade       text not null,
  budget_hc   int default 0,
  realise_hc  int default 0,
  created_at  timestamptz default now(),
  unique (annee, service, grade)
);

-- RLS
alter table public.employe       enable row level security;
alter table public.budget_poste  enable row level security;

do $$ declare t text;
begin
  foreach t in array array['employe','budget_poste'] loop
    execute format('create policy "sel" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "ins" on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy "upd" on public.%I for update to authenticated using (true)', t);
    execute format('create policy "del" on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;
