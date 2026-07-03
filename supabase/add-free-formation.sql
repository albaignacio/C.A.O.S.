-- ============================================================================
--  C.A.O.S · Migración: Formación libre
--  Corré esto UNA VEZ en el SQL Editor de Supabase.
--
--  Agrega coordenadas x/y (en % de la cancha) a lineup_positions para el modo
--  "Formación libre". 100% compatible hacia atrás: las alineaciones con
--  formaciones fijas ya guardadas siguen funcionando igual (x/y quedan null).
-- ============================================================================

alter table public.lineup_positions
  add column if not exists x double precision,
  add column if not exists y double precision;
