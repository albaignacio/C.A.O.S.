import type { Slot } from '../../lib/formations';
import type { Player } from '../../types';
import { POSITION_SHORT } from '../../lib/helpers';
import { Pitch } from './Pitch';
import { PlayerToken } from './PlayerToken';

interface Props {
  slots: Slot[];
  /** Mapa slot_index -> jugador asignado. */
  assignments: Record<number, Player | undefined>;
  onSlotClick: (slot: Slot) => void;
}

/** Cancha con los puestos de una formación fija. */
export function FormationField({ slots, assignments, onSlotClick }: Props) {
  return (
    <div className="mx-auto w-full max-w-md animate-fade-up">
      <Pitch>
        {slots.map((slot) => (
          <button
            key={slot.index}
            onClick={() => onSlotClick(slot)}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
          >
            <PlayerToken
              player={assignments[slot.index]}
              emptyLabel={POSITION_SHORT[slot.role]}
              isDt={slot.role === 'dt'}
            />
          </button>
        ))}
      </Pitch>
    </div>
  );
}
