export type Position = 'arquero' | 'defensor' | 'mediocampista' | 'delantero' | 'dt';

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
  /** Consignas del DT (modo presentación). */
  notas: string | null;
  created_at: string;
}

/** Ficha sobre la pizarra táctica (coordenadas en % de la cancha). */
export interface BoardToken {
  playerId: string;
  x: number;
  y: number;
}

/** Trazo dibujado sobre la pizarra. */
export interface BoardStroke {
  kind: 'arrow' | 'pass' | 'press';
  color: string;
  points: { x: number; y: number }[];
}

export interface BoardData {
  tokens: BoardToken[];
  strokes: BoardStroke[];
}

export interface Board {
  id: string;
  nombre: string;
  data: BoardData;
  created_at: string;
  updated_at: string;
}

export interface LineupPosition {
  id: string;
  lineup_id: string;
  slot_index: number;
  player_id: string | null;
  /** Coordenadas en % (solo formación libre; null en formaciones fijas). */
  x: number | null;
  y: number | null;
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
