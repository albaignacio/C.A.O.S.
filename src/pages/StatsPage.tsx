import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trophy,
  Calendar,
  Pencil,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Match, PlayerSeasonStats } from '../types';
import { usePlayers } from '../hooks/usePlayers';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { ListSkeleton, TableSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../lib/helpers';
import { MatchForm } from '../components/stats/MatchForm';
import { MatchStatsEditor } from '../components/stats/MatchStatsEditor';
import { toast } from '../components/Toast';

type Tab = 'ranking' | 'partidos';

export function StatsPage() {
  const [tab, setTab] = useState<Tab>('ranking');
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-900">Estadísticas</h2>
        <p className="text-sm text-slate-400">Partidos, goles, asistencias y MVPs de la temporada.</p>
      </div>

      <div className="seg mb-5 grid-cols-2">
        <button
          onClick={() => setTab('ranking')}
          className={`seg-item ${tab === 'ranking' ? 'seg-item-active' : ''}`}
        >
          <BarChart3 className="h-4 w-4" /> Ranking
        </button>
        <button
          onClick={() => setTab('partidos')}
          className={`seg-item ${tab === 'partidos' ? 'seg-item-active' : ''}`}
        >
          <ClipboardList className="h-4 w-4" /> Partidos
        </button>
      </div>

      {tab === 'ranking' ? <RankingTab /> : <MatchesTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranking (vista acumulada, ordenable)
// ---------------------------------------------------------------------------
type SortKey = 'total_goles' | 'total_asistencias' | 'total_mvp';

function RankingTab() {
  const [stats, setStats] = useState<PlayerSeasonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('total_goles');
  const [asc, setAsc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from('player_season_stats').select('*');
    if (err) {
      setError('No se pudieron cargar las estadísticas.');
      console.error(err);
    } else {
      setStats((data ?? []) as PlayerSeasonStats[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => {
    const arr = [...stats];
    arr.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      if (diff !== 0) return asc ? diff : -diff;
      // Desempate por goles y luego nombre.
      if (b.total_goles !== a.total_goles) return b.total_goles - a.total_goles;
      return a.nombre.localeCompare(b.nombre);
    });
    return arr;
  }, [stats, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (stats.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="h-7 w-7" />}
        title="Todavía no hay estadísticas"
        description="Cargá jugadores y partidos para ver el ranking del plantel."
      />
    );
  }

  return (
    <div className="card animate-fade-up overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2.5 font-semibold">#</th>
            <th className="px-1 py-2.5 font-semibold">Jugador</th>
            <SortHeader label="Goles" active={sortKey === 'total_goles'} asc={asc} onClick={() => toggleSort('total_goles')} />
            <SortHeader label="Asist." active={sortKey === 'total_asistencias'} asc={asc} onClick={() => toggleSort('total_asistencias')} />
            <SortHeader label="MVP" active={sortKey === 'total_mvp'} asc={asc} onClick={() => toggleSort('total_mvp')} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={p.id} className="border-b border-slate-50 last:border-0">
              <td className="px-3 py-2.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? 'bg-amber-100 text-amber-600'
                      : i === 1
                        ? 'bg-slate-200 text-slate-600'
                        : i === 2
                          ? 'bg-orange-100 text-orange-600'
                          : 'text-slate-400'
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="px-1 py-2">
                <div className="flex items-center gap-2">
                  <Avatar nombre={p.nombre} apodo={p.apodo} fotoUrl={p.foto_url} size={34} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-700">{p.apodo || p.nombre}</p>
                    <p className="tnum text-[11px] text-slate-400">{p.partidos_jugados} PJ</p>
                  </div>
                </div>
              </td>
              <StatCell value={p.total_goles} active={sortKey === 'total_goles'} />
              <StatCell value={p.total_asistencias} active={sortKey === 'total_asistencias'} />
              <StatCell value={p.total_mvp} active={sortKey === 'total_mvp'} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-2 py-2.5 font-semibold">
      <button
        onClick={onClick}
        className={`flex w-full items-center justify-center gap-0.5 ${
          active ? 'text-celeste-600' : 'text-slate-400'
        }`}
      >
        {label}
        {active ? (
          asc ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </button>
    </th>
  );
}

function StatCell({ value, active }: { value: number; active: boolean }) {
  return (
    <td className="px-2 py-2 text-center">
      <span className={`tnum font-display font-bold ${active ? 'text-celeste-600' : 'text-slate-700'}`}>
        {value}
      </span>
    </td>
  );
}

// ---------------------------------------------------------------------------
// Partidos
// ---------------------------------------------------------------------------
function MatchesTab() {
  const { players } = usePlayers();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [statsMatch, setStatsMatch] = useState<Match | null>(null);
  const [deleting, setDeleting] = useState<Match | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('matches')
      .select('*')
      .order('fecha', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (err) {
      setError('No se pudieron cargar los partidos.');
      console.error(err);
    } else {
      setMatches((data ?? []) as Match[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    const { error: err } = await supabase.from('matches').delete().eq('id', deleting.id);
    if (err) {
      toast('No se pudo eliminar el partido.', 'error');
      console.error(err);
      return;
    }
    setDeleting(null);
    toast('Partido eliminado');
    void load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => {
            setEditingMatch(null);
            setFormOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> Nuevo partido
        </button>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title="No hay partidos cargados"
          description="Registrá un partido para empezar a cargar goles, asistencias y MVP."
          action={
            <button onClick={() => setFormOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Nuevo partido
            </button>
          }
        />
      ) : (
        <ul className="stagger space-y-2.5">
          {matches.map((m) => (
            <li key={m.id} className="card card-hover p-4">
              <div className="flex items-center gap-3">
                <ResultBadge gf={m.goles_favor} gc={m.goles_contra} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">vs {m.rival}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3 w-3" /> {formatDate(m.fecha)}
                  </p>
                </div>
                <button
                  onClick={() => setStatsMatch(m)}
                  className="btn-primary"
                  title="Cargar estadísticas"
                >
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">Stats</span>
                </button>
                <button
                  onClick={() => {
                    setEditingMatch(m);
                    setFormOpen(true);
                  }}
                  className="btn-ghost"
                  title="Editar partido"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleting(m)}
                  className="btn-ghost text-red-500 hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MatchForm
        open={formOpen}
        match={editingMatch}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          toast('Partido guardado');
          void load();
        }}
      />

      <MatchStatsEditor
        open={!!statsMatch}
        match={statsMatch}
        players={players}
        onClose={() => setStatsMatch(null)}
        onSaved={() => {
          setStatsMatch(null);
          toast('Estadísticas guardadas');
          void load();
        }}
      />

      <Modal
        open={!!deleting}
        title="Eliminar partido"
        onClose={() => setDeleting(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={confirmDelete} className="btn-danger">
              Sí, eliminar
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Eliminar el partido vs <span className="font-semibold">{deleting?.rival}</span>? Se
          borrarán también sus estadísticas.
        </p>
      </Modal>
    </div>
  );
}

/** Marcador con color según resultado (verde ganó, gris empató, rojo perdió). */
function ResultBadge({ gf, gc }: { gf: number; gc: number }) {
  const style =
    gf > gc
      ? 'bg-emerald-50 text-emerald-600'
      : gf < gc
        ? 'bg-rose-50 text-rose-600'
        : 'bg-slate-100 text-slate-500';
  return (
    <div
      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl font-display font-bold ${style}`}
    >
      <span className="tnum text-base leading-none">
        {gf}-{gc}
      </span>
    </div>
  );
}
