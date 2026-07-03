import type { Slot } from '../../lib/formations';
import type { Player } from '../../types';
import { getInitials, POSITION_SHORT } from '../../lib/helpers';

interface Props {
  slots: Slot[];
  /** Mapa slot_index -> jugador asignado. */
  assignments: Record<number, Player | undefined>;
  onSlotClick: (slot: Slot) => void;
}

/** Cancha vista desde arriba con las posiciones de la formación. */
export function FormationField({ slots, assignments, onSlotClick }: Props) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border-2 border-white/70 shadow-inner"
        style={{
          background:
            'repeating-linear-gradient(0deg, #43a047 0px, #43a047 40px, #4caf50 40px, #4caf50 80px)',
        }}
      >
        {/* Líneas de la cancha */}
        <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-white/60" />
        {/* Línea de mitad de cancha */}
        <div className="pointer-events-none absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 bg-white/60" />
        {/* Círculo central */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
        {/* Área rival (arriba) */}
        <div className="pointer-events-none absolute left-1/2 top-2 h-16 w-2/5 -translate-x-1/2 border-2 border-t-0 border-white/60" />
        <div className="pointer-events-none absolute left-1/2 top-2 h-7 w-1/5 -translate-x-1/2 border-2 border-t-0 border-white/60" />
        {/* Área propia (abajo) */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 h-16 w-2/5 -translate-x-1/2 border-2 border-b-0 border-white/60" />
        <div className="pointer-events-none absolute bottom-2 left-1/2 h-7 w-1/5 -translate-x-1/2 border-2 border-b-0 border-white/60" />

        {/* Puestos */}
        {slots.map((slot) => {
          const player = assignments[slot.index];
          return (
            <button
              key={slot.index}
              onClick={() => onSlotClick(slot)}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus:outline-none"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow-md ring-2 transition-transform active:scale-95 ${
                  player
                    ? 'bg-white text-celeste-700 ring-celeste-500'
                    : 'bg-white/25 text-white ring-white/70 backdrop-blur-sm'
                }`}
              >
                {player ? (
                  player.foto_url ? (
                    <img
                      src={player.foto_url}
                      alt={player.nombre}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    player.numero ?? getInitials(player.nombre, player.apodo)
                  )
                ) : (
                  POSITION_SHORT[slot.role]
                )}
              </span>
              <span className="mt-1 max-w-[72px] truncate rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {player ? player.apodo || player.nombre.split(' ')[0] : 'Vacío'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
