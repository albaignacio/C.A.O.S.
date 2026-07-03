import type { Player } from '../../types';
import { getInitials } from '../../lib/helpers';

interface Props {
  player?: Player;
  /** Texto del círculo cuando el puesto está vacío (ej: "DEL"). */
  emptyLabel?: string;
  isDt?: boolean;
  dragging?: boolean;
}

/** Ficha de jugador sobre la cancha: círculo (foto / número / iniciales) + nombre. */
export function PlayerToken({ player, emptyLabel, isDt, dragging }: Props) {
  const circle = isDt
    ? 'bg-slate-900 text-amber-300 ring-amber-400/90'
    : player
      ? 'bg-white text-celeste-700 ring-white'
      : 'border border-dashed border-white/70 bg-white/15 text-white ring-transparent backdrop-blur-[2px]';

  return (
    <div
      className={`flex flex-col items-center transition-transform duration-150 ${
        dragging ? 'scale-110' : ''
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full font-display text-sm font-bold shadow-lift ring-2 ${circle}`}
      >
        {player ? (
          player.foto_url ? (
            <img
              src={player.foto_url}
              alt={player.nombre}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            player.numero ?? getInitials(player.nombre, player.apodo)
          )
        ) : (
          emptyLabel
        )}
      </span>
      <span
        className={`mt-1 max-w-[76px] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${
          player ? 'bg-white/95 text-slate-800' : 'bg-black/25 text-white'
        }`}
      >
        {player ? player.apodo || player.nombre.split(' ')[0] : isDt ? 'DT' : 'Vacío'}
      </span>
    </div>
  );
}
