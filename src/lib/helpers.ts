import type { Position } from '../types';

/** Iniciales para el avatar cuando no hay foto (usa apodo o nombre). */
export function getInitials(nombre: string, apodo?: string | null): string {
  const base = (apodo && apodo.trim()) || nombre || '';
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const POSITION_LABELS: Record<Position, string> = {
  arquero: 'Arquero',
  defensor: 'Defensor',
  mediocampista: 'Mediocampista',
  delantero: 'Delantero',
  dt: 'Director Técnico',
};

export const POSITION_SHORT: Record<Position, string> = {
  arquero: 'ARQ',
  defensor: 'DEF',
  mediocampista: 'MED',
  delantero: 'DEL',
  dt: 'DT',
};

/** Clases de color (fondo + texto) para el badge de cada posición. */
export const POSITION_COLORS: Record<Position, string> = {
  arquero: 'bg-amber-100 text-amber-700',
  defensor: 'bg-blue-100 text-blue-700',
  mediocampista: 'bg-emerald-100 text-emerald-700',
  delantero: 'bg-rose-100 text-rose-700',
  dt: 'bg-slate-800 text-amber-300',
};

export const POSITIONS: Position[] = [
  'arquero',
  'defensor',
  'mediocampista',
  'delantero',
  'dt',
];

/** Formatea una fecha ISO (yyyy-mm-dd) a dd/mm/yyyy. */
export function formatDate(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const [y, m, d] = iso.split('T')[0].split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Fecha de hoy en formato yyyy-mm-dd para inputs date. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
