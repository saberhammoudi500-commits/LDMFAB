-- ============================================================
-- 003 — Plan Directeur de Production
-- ============================================================

create table if not exists public.pdp (
  id          uuid primary key default gen_random_uuid(),
  annee       int not null,
  mois        int not null,
  created_at  timestamptz default now(),
  unique (annee, mois)
);

create table if not exists public.pdp_ligne (
  id                uuid primary key default gen_random_uuid(),
  pdp_id            uuid not null references public.pdp(id) on delete cascade,
  produit_id        uuid not null references public.produit(id),
  donneur_ordre_id  uuid not null references public.donneur_ordre(id),
  plan_qte_fab      int default 0,
  plan_qte_cndt     int default 0,
  plan_valeur       numeric default 0,
  realise_fab       int default 0,
  realise_cndt      int default 0,
  realise_valeur    numeric default 0,
  created_at        timestamptz default now(),
  unique (pdp_id, produit_id)
);

create table if not exists public.calendrier_jour (
  id          uuid primary key default gen_random_uuid(),
  pdp_id      uuid not null references public.pdp(id) on delete cascade,
  date        date not null,
  type        text not null default 'OUVRE',
  created_at  timestamptz default now(),
  unique (pdp_id, date)
);

-- RLS
alter table public.pdp              enable row level security;
alter table public.pdp_ligne        enable row level security;
alter table public.calendrier_jour  enable row level security;

do $$ declare t text;
begin
  foreach t in array array['pdp','pdp_ligne','calendrier_jour'] loop
    execute format('create policy "sel" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "ins" on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy "upd" on public.%I for update to authenticated using (true)', t);
    execute format('create policy "del" on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;
