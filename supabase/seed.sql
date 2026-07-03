-- ============================================================================
--  C.A.O.S · Datos de prueba (seed)
--  Corré este archivo DESPUÉS de schema.sql, en el SQL Editor de Supabase.
--  Carga ~16 jugadores ficticios + 2 partidos de ejemplo con estadísticas.
--  Volver a correrlo duplicaría los datos: si querés reiniciar, descomentá el
--  bloque "RESET" de abajo.
-- ============================================================================

-- --- RESET (opcional) — descomentar para borrar todo antes de sembrar ---
-- truncate table public.match_stats, public.lineup_positions,
--                public.matches, public.lineups, public.players
--   restart identity cascade;

-- ----------------------------------------------------------------------------
-- Jugadores
-- ----------------------------------------------------------------------------
insert into public.players (nombre, apodo, numero, posicion) values
  ('Martín Gómez',      'El Toro',   9,  'delantero'),
  ('Lucas Fernández',   'Colo',      7,  'delantero'),
  ('Diego Martínez',    'Pipa',      10, 'mediocampista'),
  ('Sebastián Ruiz',    'Seba',      8,  'mediocampista'),
  ('Nicolás Sosa',      'Nico',      5,  'mediocampista'),
  ('Franco Herrera',    'Franquito', 6,  'mediocampista'),
  ('Emiliano Torres',   'Emi',       11, 'delantero'),
  ('Julián Romero',     'Juli',      4,  'defensor'),
  ('Matías Álvarez',    'Colo Mati', 2,  'defensor'),
  ('Gonzalo Díaz',      'Gonza',     3,  'defensor'),
  ('Federico Castro',   'Fede',      13, 'defensor'),
  ('Ramiro Benítez',    'Rama',      14, 'defensor'),
  ('Ignacio Morales',   'Nacho',     1,  'arquero'),
  ('Tomás Aguirre',     'Tomi',      12, 'arquero'),
  ('Bruno Vega',        'Bruno',     16, 'mediocampista'),
  ('Agustín Silva',     'Agus',      17, 'delantero');

-- ----------------------------------------------------------------------------
-- Partido de ejemplo 1 (victoria 3-1) + estadísticas
-- ----------------------------------------------------------------------------
with nuevo_partido as (
  insert into public.matches (rival, fecha, goles_favor, goles_contra)
  values ('Deportivo Rival', current_date - interval '14 days', 3, 1)
  returning id
)
insert into public.match_stats (match_id, player_id, goles, asistencias, es_mvp)
select np.id, p.id, d.goles, d.asist, d.mvp
from nuevo_partido np
join (values
  ('El Toro', 2, 0, true),
  ('Colo',    1, 1, false),
  ('Pipa',    0, 2, false),
  ('Emi',     0, 1, false)
) as d(apodo, goles, asist, mvp) on true
join public.players p on p.apodo = d.apodo;

-- ----------------------------------------------------------------------------
-- Partido de ejemplo 2 (empate 2-2) + estadísticas
-- ----------------------------------------------------------------------------
with nuevo_partido as (
  insert into public.matches (rival, fecha, goles_favor, goles_contra)
  values ('Atlético Barrio Sur', current_date - interval '7 days', 2, 2)
  returning id
)
insert into public.match_stats (match_id, player_id, goles, asistencias, es_mvp)
select np.id, p.id, d.goles, d.asist, d.mvp
from nuevo_partido np
join (values
  ('Pipa', 1, 0, true),
  ('Emi',  1, 0, false),
  ('Seba', 0, 2, false)
) as d(apodo, goles, asist, mvp) on true
join public.players p on p.apodo = d.apodo;
