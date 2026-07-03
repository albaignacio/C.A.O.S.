-- ============================================================================
--  C.A.O.S · Schema completo para Supabase (PostgreSQL)
--  Corré TODO este archivo en el SQL Editor de Supabase (New query -> pegar -> Run).
--  Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- Extensión para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- TABLAS
-- ----------------------------------------------------------------------------

-- Plantel de jugadores
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  apodo      text,
  numero     int,
  posicion   text not null default 'mediocampista'
             check (posicion in ('arquero', 'defensor', 'mediocampista', 'delantero')),
  foto_url   text,
  created_at timestamptz not null default now()
);

-- Alineaciones guardadas
create table if not exists public.lineups (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  formacion  text not null,               -- ej: '4-3-3'
  fecha      date,
  created_at timestamptz not null default now()
);

-- Posiciones de cada alineación (un jugador por slot de la formación)
create table if not exists public.lineup_positions (
  id         uuid primary key default gen_random_uuid(),
  lineup_id  uuid not null references public.lineups(id) on delete cascade,
  slot_index int not null,                -- índice del puesto dentro de la formación (0..10)
  player_id  uuid references public.players(id) on delete set null,
  unique (lineup_id, slot_index)
);

-- Un jugador no puede ocupar dos puestos en la misma alineación
create unique index if not exists lineup_positions_unique_player
  on public.lineup_positions (lineup_id, player_id)
  where player_id is not null;

-- Partidos
create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  rival        text not null,
  fecha        date,
  goles_favor  int not null default 0,
  goles_contra int not null default 0,
  created_at   timestamptz not null default now()
);

-- Estadísticas por jugador en cada partido
create table if not exists public.match_stats (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  goles       int not null default 0,
  asistencias int not null default 0,
  es_mvp      boolean not null default false,
  unique (match_id, player_id)
);

-- Un solo MVP por partido (a nivel base de datos)
create unique index if not exists match_stats_one_mvp
  on public.match_stats (match_id)
  where es_mvp = true;

-- ----------------------------------------------------------------------------
-- VISTA: acumulado de estadísticas por jugador en la temporada
-- ----------------------------------------------------------------------------
create or replace view public.player_season_stats
with (security_invoker = true) as
select
  p.id,
  p.nombre,
  p.apodo,
  p.numero,
  p.posicion,
  p.foto_url,
  coalesce(sum(ms.goles), 0)::int                          as total_goles,
  coalesce(sum(ms.asistencias), 0)::int                    as total_asistencias,
  coalesce(sum(case when ms.es_mvp then 1 else 0 end), 0)::int as total_mvp,
  count(distinct ms.match_id)::int                         as partidos_jugados
from public.players p
left join public.match_stats ms on ms.player_id = p.id
group by p.id;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--   La app no usa login: la data del club es compartida y abierta. Se permite
--   acceso al rol anónimo (anon) y al logueado (authenticated).
--   ⚠️ Cualquiera con la URL de la app publicada puede ver y editar los datos.
--      Si querés cerrarlo, cambiá "anon, authenticated" por solo "authenticated".
-- ----------------------------------------------------------------------------
alter table public.players          enable row level security;
alter table public.lineups          enable row level security;
alter table public.lineup_positions enable row level security;
alter table public.matches          enable row level security;
alter table public.match_stats      enable row level security;

drop policy if exists "players_all"          on public.players;
drop policy if exists "lineups_all"          on public.lineups;
drop policy if exists "lineup_positions_all" on public.lineup_positions;
drop policy if exists "matches_all"          on public.matches;
drop policy if exists "match_stats_all"      on public.match_stats;

create policy "players_all"          on public.players          for all to anon, authenticated using (true) with check (true);
create policy "lineups_all"          on public.lineups          for all to anon, authenticated using (true) with check (true);
create policy "lineup_positions_all" on public.lineup_positions for all to anon, authenticated using (true) with check (true);
create policy "matches_all"          on public.matches          for all to anon, authenticated using (true) with check (true);
create policy "match_stats_all"      on public.match_stats      for all to anon, authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- STORAGE: bucket público para las fotos de los jugadores
--   (También podés crearlo desde el panel: Storage -> New bucket -> "player-photos" -> Public)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

-- Cualquiera puede LEER las fotos (bucket público)
drop policy if exists "player_photos_read" on storage.objects;
create policy "player_photos_read"
  on storage.objects for select
  to public
  using (bucket_id = 'player-photos');

-- Subir / actualizar / borrar fotos (app sin login: se permite anon)
drop policy if exists "player_photos_insert" on storage.objects;
create policy "player_photos_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'player-photos');

drop policy if exists "player_photos_update" on storage.objects;
create policy "player_photos_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'player-photos');

drop policy if exists "player_photos_delete" on storage.objects;
create policy "player_photos_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'player-photos');

-- Listo. Ahora corré supabase/seed.sql para cargar jugadores de prueba (opcional).
