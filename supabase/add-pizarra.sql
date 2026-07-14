-- ============================================================================
--  C.A.O.S · Migración: Pizarra táctica + consignas del DT
--  Corré esto UNA VEZ en el SQL Editor de Supabase.
--  Compatible hacia atrás: no toca nada de lo existente.
-- ============================================================================

-- Pizarras tácticas guardadas (posiciones de fichas + dibujos)
create table if not exists public.boards (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  data       jsonb not null default '{}'::jsonb,  -- { tokens: [{playerId,x,y}], strokes: [{kind,color,points}] }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;
drop policy if exists "boards_all" on public.boards;
create policy "boards_all" on public.boards
  for all to anon, authenticated using (true) with check (true);

-- Consignas / indicaciones del DT por alineación (modo presentación)
alter table public.lineups add column if not exists notas text;
