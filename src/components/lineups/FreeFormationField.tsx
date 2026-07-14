import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Player } from '../../types';
import { Pitch } from './Pitch';
import { PlayerToken } from './PlayerToken';

/** Posición libre de un jugador sobre la cancha (x/y en %, responsive). */
export interface FreePosition {
  playerId: string;
  x: number;
  y: number;
}

interface Props {
  positions: FreePosition[];
  playersById: Record<string, Player>;
  onMove: (playerId: string, x: number, y: number) => void;
  onRemove: (playerId: string) => void;
}

const clamp = (v: number, min = 5, max = 95) => Math.min(max, Math.max(min, v));
/** Umbral en px para distinguir un toque de un arrastre. */
const TAP_THRESHOLD = 6;

/**
 * Cancha de formación libre: cada jugador se arrastra a cualquier coordenada.
 * Usa Pointer Events, así que funciona igual con mouse y con touch.
 */
export function FreeFormationField({ positions, playersById, onMove, onRemove }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<FreePosition | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  function toFieldCoords(e: React.PointerEvent): { x: number; y: number } | null {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  }

  function handleDown(e: React.PointerEvent, pos: FreePosition) {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* continuar sin captura */
    }
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setDrag(pos);
  }

  function handleMove(e: React.PointerEvent, playerId: string) {
    if (!drag || drag.playerId !== playerId || !start.current) return;
    if (
      Math.abs(e.clientX - start.current.x) < TAP_THRESHOLD &&
      Math.abs(e.clientY - start.current.y) < TAP_THRESHOLD &&
      !moved.current
    ) {
      return; // todavía es un toque, no un arrastre
    }
    const p = toFieldCoords(e);
    if (!p) return;
    moved.current = true;
    setDrag({ playerId, ...p });
  }

  function handleUp(playerId: string) {
    if (!drag || drag.playerId !== playerId) return;
    if (moved.current) {
      onMove(playerId, Math.round(drag.x * 10) / 10, Math.round(drag.y * 10) / 10);
      setSelected(null);
    } else {
      // Toque: selecciona / deselecciona (muestra el botón de quitar)
      setSelected((cur) => (cur === playerId ? null : playerId));
    }
    setDrag(null);
    start.current = null;
  }

  return (
    <div className="mx-auto w-full max-w-md animate-fade-up">
      <Pitch fieldRef={fieldRef}>
        {positions.length === 0 && (
          <p className="absolute inset-x-8 top-1/2 -translate-y-1/2 text-center text-sm font-semibold leading-relaxed text-white/85">
            Cancha libre: agregá jugadores y arrastralos a donde quieras.
          </p>
        )}
        {positions.map((pos) => {
          const player = playersById[pos.playerId];
          if (!player) return null;
          const isDragging = drag?.playerId === pos.playerId;
          const cur = isDragging ? drag : pos;
          const isSelected = selected === pos.playerId;
          return (
            <div
              key={pos.playerId}
              style={{ left: `${cur.x}%`, top: `${cur.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none ${
                isDragging ? 'z-20 cursor-grabbing' : 'z-0 cursor-grab'
              } ${isSelected ? 'z-10' : ''}`}
              onPointerDown={(e) => handleDown(e, pos)}
              onPointerMove={(e) => handleMove(e, pos.playerId)}
              onPointerUp={() => handleUp(pos.playerId)}
              onPointerCancel={() => setDrag(null)}
            >
              <PlayerToken player={player} isDt={player.posicion === 'dt'} dragging={isDragging} />
              {isSelected && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(null);
                    onRemove(pos.playerId);
                  }}
                  className="absolute -right-2 -top-2 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lift transition-transform active:scale-90"
                  aria-label={`Quitar a ${player.apodo || player.nombre} de la cancha`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </Pitch>
      <p className="mt-2 text-center text-xs text-slate-400">
        Arrastrá una ficha para moverla · tocala para quitarla
      </p>
    </div>
  );
}
