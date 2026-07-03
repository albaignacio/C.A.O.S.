import type { Position } from '../types';
import { POSITION_COLORS, POSITION_LABELS } from '../lib/helpers';

export function PositionBadge({ position }: { position: Position }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${POSITION_COLORS[position]}`}
    >
      {POSITION_LABELS[position]}
    </span>
  );
}
