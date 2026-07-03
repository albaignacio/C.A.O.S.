import type { Position } from '../types';

/**
 * Un puesto dentro de una formación, ubicado sobre la cancha (vista desde arriba).
 * Coordenadas en porcentaje (0..100):
 *   x = horizontal (0 izquierda, 100 derecha)
 *   y = vertical   (0 arco rival / ataque, 100 arco propio / arquero)
 */
export interface Slot {
  index: number;
  x: number;
  y: number;
  role: Position;
}

interface Line {
  y: number;
  role: Position;
  count: number;
}

interface FormationDef {
  name: string;
  lines: Line[];
}

/** Reparte `n` puestos de forma pareja sobre el ancho de la cancha. */
function spread(n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.round(((i + 1) * 1000) / (n + 1)) / 10);
}

/** Definición de cada formación por líneas (de defensa a ataque). */
const DEFS: FormationDef[] = [
  {
    name: '4-3-3',
    lines: [
      { y: 90, role: 'arquero', count: 1 },
      { y: 72, role: 'defensor', count: 4 },
      { y: 48, role: 'mediocampista', count: 3 },
      { y: 18, role: 'delantero', count: 3 },
    ],
  },
  {
    name: '4-2-3-1',
    lines: [
      { y: 90, role: 'arquero', count: 1 },
      { y: 74, role: 'defensor', count: 4 },
      { y: 58, role: 'mediocampista', count: 2 },
      { y: 38, role: 'mediocampista', count: 3 },
      { y: 16, role: 'delantero', count: 1 },
    ],
  },
  {
    name: '4-4-2',
    lines: [
      { y: 90, role: 'arquero', count: 1 },
      { y: 72, role: 'defensor', count: 4 },
      { y: 48, role: 'mediocampista', count: 4 },
      { y: 18, role: 'delantero', count: 2 },
    ],
  },
  {
    name: '3-4-3',
    lines: [
      { y: 90, role: 'arquero', count: 1 },
      { y: 74, role: 'defensor', count: 3 },
      { y: 50, role: 'mediocampista', count: 4 },
      { y: 18, role: 'delantero', count: 3 },
    ],
  },
  {
    name: '3-5-2',
    lines: [
      { y: 90, role: 'arquero', count: 1 },
      { y: 76, role: 'defensor', count: 3 },
      { y: 50, role: 'mediocampista', count: 5 },
      { y: 18, role: 'delantero', count: 2 },
    ],
  },
  {
    name: '5-3-2',
    lines: [
      { y: 90, role: 'arquero', count: 1 },
      { y: 74, role: 'defensor', count: 5 },
      { y: 48, role: 'mediocampista', count: 3 },
      { y: 18, role: 'delantero', count: 2 },
    ],
  },
  {
    name: '4-1-4-1',
    lines: [
      { y: 90, role: 'arquero', count: 1 },
      { y: 76, role: 'defensor', count: 4 },
      { y: 60, role: 'mediocampista', count: 1 },
      { y: 42, role: 'mediocampista', count: 4 },
      { y: 16, role: 'delantero', count: 1 },
    ],
  },
];

/** Índice fijo del puesto de DT (va después de los 11 titulares: 0..10). */
export const DT_SLOT_INDEX = 11;

/**
 * Identificador del modo "Formación libre": los jugadores se colocan en
 * cualquier coordenada de la cancha (x/y en %) en vez de en puestos fijos.
 */
export const FREE_FORMATION = 'libre';

function buildSlots(def: FormationDef): Slot[] {
  const slots: Slot[] = [];
  let index = 0;
  for (const line of def.lines) {
    for (const x of spread(line.count)) {
      slots.push({ index: index++, x, y: line.y, role: line.role });
    }
  }
  // DT: al costado de la cancha (esquina inferior izquierda, tipo banco).
  slots.push({ index: DT_SLOT_INDEX, x: 12, y: 88, role: 'dt' });
  return slots;
}

/** Mapa nombre-de-formación -> puestos ya calculados. */
export const FORMATIONS: Record<string, Slot[]> = Object.fromEntries(
  DEFS.map((def) => [def.name, buildSlots(def)]),
);

/** Lista de nombres de formaciones disponibles (para el selector). */
export const FORMATION_NAMES: string[] = DEFS.map((d) => d.name);

export function getSlots(formacion: string): Slot[] {
  return FORMATIONS[formacion] ?? FORMATIONS[FORMATION_NAMES[0]];
}
