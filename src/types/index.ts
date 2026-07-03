export type Position = 'arquero' | 'defensor' | 'mediocampista' | 'delantero';

export interface Player {
  id: string;
  nombre: string;
  apodo: string | null;
  numero: number | null;
  posicion: Position;
  foto_url: string | null;
  created_at: string;
}

/** Datos que se envían al crear / editar un jugador (sin campos autogenerados). */
export type PlayerInput = Omit<Player, 'id' | 'created_at'>;

export interface Lineup {
  id: string;
  nombre: string;
  formacion: string;
  fecha: string | null;
  created_at: string;
}

export interface LineupPosition {
  id: string;
  lineup_id: string;
  slot_index: number;
  player_id: string | null;
}

export interface Match {
  id: string;
  rival: string;
  fecha: string | null;
  goles_favor: number;
  goles_contra: number;
  created_at: string;
}

export interface MatchStat {
  id: string;
  match_id: string;
  player_id: string;
  goles: number;
  asistencias: number;
  es_mvp: boolean;
}

/** Fila de la vista player_season_stats (acumulado de temporada). */
export interface PlayerSeasonStats {
  id: string;
  nombre: string;
  apodo: string | null;
  numero: number | null;
  posicion: Position;
  foto_url: string | null;
  total_goles: number;
  total_asistencias: number;
  total_mvp: number;
  partidos_jugados: number;
}
