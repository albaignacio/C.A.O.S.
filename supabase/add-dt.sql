-- ============================================================================
--  C.A.O.S · Habilitar la posición "dt" (Director Técnico)
--  Corré esto UNA VEZ en el SQL Editor de Supabase.
-- ============================================================================
alter table public.players drop constraint if exists players_posicion_check;
alter table public.players add constraint players_posicion_check
  check (posicion in ('arquero', 'defensor', 'mediocampista', 'delantero', 'dt'));
