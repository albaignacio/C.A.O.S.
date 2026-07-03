import { useMemo, useState } from 'react';
import { Check, UserMinus, Search } from 'lucide-react';
import type { Player } from '../../types';
import type { Slot } from '../../lib/formations';
import { Modal } from '../Modal';
import { Avatar } from '../Avatar';
import { PositionBadge } from '../PositionBadge';
import { POSITION_LABELS } from '../../lib/helpers';

interface Props {
  open: boolean;
  slot: Slot | null;
  players: Player[];
  /** slot_index -> playerId asignado (para saber quién está ocupado). */
  takenByPlayer: Record<string, number>;
  currentPlayerId: string | null;
  onPick: (playerId: string | null) => void;
  onClose: () => void;
  /** Título alternativo (ej: modo libre, sin puesto fijo). */
  title?: string;
}

export function PlayerPicker({
  open,
  slot,
  players,
  takenByPlayer,
  currentPlayerId,
  onPick,
  onClose,
  title,
}: Props) {
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = players.filter(
      (p) =>
        !q || p.nombre.toLowerCase().includes(q) || (p.apodo ?? '').toLowerCase().includes(q),
    );
    // Ordena: primero los de la posición del puesto, después el resto.
    if (!slot) return filtered;
    return [...filtered].sort((a, b) => {
      const am = a.posicion === slot.role ? 0 : 1;
      const bm = b.posicion === slot.role ? 0 : 1;
      return am - bm;
    });
  }, [players, query, slot]);

  return (
    <Modal
      open={open}
      title={slot ? `Asignar puesto · ${POSITION_LABELS[slot.role]}` : (title ?? 'Agregar jugador')}
      onClose={onClose}
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          className="input pl-9"
          placeholder="Buscar jugador…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {currentPlayerId && (
        <button
          onClick={() => onPick(null)}
          className="mb-2 flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
        >
          <UserMinus className="h-4 w-4" />
          Dejar el puesto vacío
        </button>
      )}

      <ul className="space-y-1.5">
        {list.map((p) => {
          const assignedSlot = takenByPlayer[p.id];
          const isTaken = assignedSlot !== undefined && p.id !== currentPlayerId;
          const isCurrent = p.id === currentPlayerId;
          return (
            <li key={p.id}>
              <button
                onClick={() => !isTaken && onPick(p.id)}
                disabled={isTaken}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                  isCurrent
                    ? 'border-celeste-300 bg-celeste-50'
                    : isTaken
                      ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                      : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Avatar nombre={p.nombre} apodo={p.apodo} fotoUrl={p.foto_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {p.numero != null && (
                      <span className="text-slate-400">#{p.numero} </span>
                    )}
                    {p.apodo || p.nombre}
                  </p>
                  <div className="mt-0.5">
                    <PositionBadge position={p.posicion} />
                  </div>
                </div>
                {isCurrent && <Check className="h-5 w-5 text-celeste-500" />}
                {isTaken && <span className="text-[10px] font-semibold text-slate-400">En cancha</span>}
              </button>
            </li>
          );
        })}
        {list.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No hay jugadores para mostrar.</p>
        )}
      </ul>
    </Modal>
  );
}
