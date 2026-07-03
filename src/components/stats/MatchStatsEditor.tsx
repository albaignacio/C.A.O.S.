import { useEffect, useState } from 'react';
import { Star, Minus, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Match, MatchStat, Player } from '../../types';
import { formatDate } from '../../lib/helpers';
import { Modal } from '../Modal';
import { Avatar } from '../Avatar';
import { Spinner } from '../Spinner';
import { ListSkeleton } from '../Skeleton';
import { InlineError } from '../ErrorState';

interface Props {
  open: boolean;
  match: Match | null;
  players: Player[];
  onClose: () => void;
  onSaved: () => void;
}

interface Row {
  goles: number;
  asistencias: number;
}

export function MatchStatsEditor({ open, match, players, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('match_stats')
        .select('*')
        .eq('match_id', match.id);
      if (cancelled) return;
      if (err) {
        setError('No se pudieron cargar las estadísticas.');
        console.error(err);
      } else {
        const map: Record<string, Row> = {};
        let mvp: string | null = null;
        for (const s of (data ?? []) as MatchStat[]) {
          map[s.player_id] = { goles: s.goles, asistencias: s.asistencias };
          if (s.es_mvp) mvp = s.player_id;
        }
        setRows(map);
        setMvpId(mvp);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, match]);

  function bump(playerId: string, field: keyof Row, delta: number) {
    setRows((prev) => {
      const cur = prev[playerId] ?? { goles: 0, asistencias: 0 };
      const value = Math.max(0, cur[field] + delta);
      return { ...prev, [playerId]: { ...cur, [field]: value } };
    });
  }

  function toggleMvp(playerId: string) {
    setMvpId((cur) => (cur === playerId ? null : playerId));
  }

  async function save() {
    if (!match) return;
    setSaving(true);
    setError(null);
    try {
      // Reemplaza todas las estadísticas del partido.
      const { error: delErr } = await supabase
        .from('match_stats')
        .delete()
        .eq('match_id', match.id);
      if (delErr) throw delErr;

      const toInsert = players
        .map((p) => {
          const r = rows[p.id] ?? { goles: 0, asistencias: 0 };
          const esMvp = mvpId === p.id;
          return { player: p.id, goles: r.goles, asistencias: r.asistencias, esMvp };
        })
        .filter((r) => r.goles > 0 || r.asistencias > 0 || r.esMvp)
        .map((r) => ({
          match_id: match.id,
          player_id: r.player,
          goles: r.goles,
          asistencias: r.asistencias,
          es_mvp: r.esMvp,
        }));

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('match_stats').insert(toInsert);
        if (insErr) throw insErr;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las estadísticas.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={match ? `Estadísticas · vs ${match.rival}` : 'Estadísticas'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            {match && formatDate(match.fecha)}
            {mvpId && ' · MVP asignado'}
          </p>
          <button onClick={save} disabled={saving || loading} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Guardar'}
          </button>
        </div>
      }
    >
      {loading ? (
        <ListSkeleton rows={5} />
      ) : players.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No hay jugadores en el plantel.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Jugador</span>
            <span className="w-20 text-center">Goles</span>
            <span className="w-20 text-center">Asist.</span>
            <span className="w-8 text-center">MVP</span>
          </div>
          {players.map((p) => {
            const r = rows[p.id] ?? { goles: 0, asistencias: 0 };
            const isMvp = mvpId === p.id;
            return (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-xl border border-slate-100 bg-white px-2 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar nombre={p.nombre} apodo={p.apodo} fotoUrl={p.foto_url} size={32} />
                  <span className="truncate text-sm font-medium text-slate-700">
                    {p.apodo || p.nombre}
                  </span>
                </div>
                <Stepper value={r.goles} onChange={(d) => bump(p.id, 'goles', d)} />
                <Stepper value={r.asistencias} onChange={(d) => bump(p.id, 'asistencias', d)} />
                <button
                  onClick={() => toggleMvp(p.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isMvp ? 'bg-amber-100 text-amber-500' : 'text-slate-300 hover:bg-slate-100'
                  }`}
                  aria-label="Marcar MVP"
                  title="MVP del partido"
                >
                  <Star className="h-5 w-5" fill={isMvp ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
          })}
          {error && <InlineError message={error} />}
        </div>
      )}
    </Modal>
  );
}

/** Control -/valor/+ compacto. */
function Stepper({ value, onChange }: { value: number; onChange: (delta: number) => void }) {
  return (
    <div className="flex w-20 items-center justify-between rounded-lg bg-slate-100 p-0.5">
      <button
        onClick={() => onChange(-1)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white"
        aria-label="Restar"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="tnum w-5 text-center text-sm font-bold text-slate-700">{value}</span>
      <button
        onClick={() => onChange(1)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white"
        aria-label="Sumar"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
