-- Tablas esperadas por la PWA. Ejecuta esto en el SQL Editor de Supabase.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  cortes integer not null default 0,
  ultimo_corte timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  precio numeric(10, 2) not null,
  es_gratis boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.visitas enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "visitas_select" on public.visitas;
drop policy if exists "visitas_insert" on public.visitas;

create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (true);
create policy "profiles_update" on public.profiles for update using (true);
create policy "visitas_select" on public.visitas for select using (true);
create policy "visitas_insert" on public.visitas for insert with check (true);
