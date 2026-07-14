import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Goal,
  Handshake,
  LayoutGrid,
  PenTool,
  Plus,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Lineup, LineupPosition, Match, PlayerSeasonStats } from '../types';
import { FREE_FORMATION, getSlots } from '../lib/formations';
import { formatDate, todayISO, getInitials } from '../lib/helpers';
import { Avatar } from '../components/Avatar';
import { MiniPitch, type MiniToken } from '../components/MiniPitch';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';

interface DashData {
  stats: PlayerSeasonStats[];
  matches: Match[];
  lastLineup: Lineup | null;
  lineupTokens: MiniToken[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsRes, matchesRes, lineupRes] = await Promise.all([
        supabase.from('player_season_stats').select('*'),
        supabase.from('matches').select('*').order('fecha', { ascending: false, nullsFirst: false }),
        supabase.from('lineups').select('*').order('created_at', { ascending: false }).limit(1),
      ]);
      if (statsRes.error) throw statsRes.error;
      if (matchesRes.error) throw matchesRes.error;
      if (lineupRes.error) throw lineupRes.error;

      const lastLineup = ((lineupRes.data ?? []) as Lineup[])[0] ?? null;
      let lineupTokens: MiniToken[] = [];

      if (lastLineup) {
        const { data: posData } = await supabase
          .from('lineup_positions')
          .select('*')
          .eq('lineup_id', lastLineup.id);
        const positions = (posData ?? []) as LineupPosition[];
        const statById = Object.fromEntries(
          ((statsRes.data ?? []) as PlayerSeasonStats[]).map((s) => [s.id, s]),
        );
        const slots = getSlots(lastLineup.formacion);
        lineupTokens = positions
          .filter((p) => p.player_id && statById[p.player_id])
          .map((p) => {
            const pl = statById[p.player_id!];
            const isDt = pl.posicion === 'dt';
            const label = isDt ? 'DT' : String(pl.numero ?? getInitials(pl.nombre, pl.apodo));
            if (lastLineup.formacion === FREE_FORMATION) {
              return { x: Number(p.x ?? 50), y: Number(p.y ?? 50), label, isDt };
            }
            const slot = slots.find((s) => s.index === p.slot_index);
            return { x: slot?.x ?? 50, y: slot?.y ?? 50, label, isDt };
          });
      }

      setData({
        stats: (statsRes.data ?? []) as PlayerSeasonStats[],
        matches: (matchesRes.data ?? []) as Match[],
        lastLineup,
        lineupTokens,
      });
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el tablero.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hoy = todayISO();

  const derived = useMemo(() => {
    if (!data) return null;
    const jugadores = data.stats.filter((s) => s.posicion !== 'dt');
    const conFecha = data.matches.filter((m) => m.fecha);
    const proximos = conFecha
      .filter((m) => m.fecha! >= hoy)
      .sort((a, b) => a.fecha!.localeCompare(b.fecha!));
    const jugados = conFecha.filter((m) => m.fecha! < hoy);
    const goleadores = [...jugadores].sort((a, b) => b.total_goles - a.total_goles).slice(0, 3);
    const asistidores = [...jugadores]
      .sort((a, b) => b.total_asistencias - a.total_asistencias)
      .slice(0, 3);
    const gf = data.matches.reduce((acc, m) => acc + m.goles_favor, 0);
    const gc = data.matches.reduce((acc, m) => acc + m.goles_contra, 0);
    return {
      jugadores: jugadores.length,
      proximo: proximos[0] ?? null,
      ultimos: jugados.slice(0, 5),
      goleadores,
      asistidores,
      gf,
      gc,
      partidos: data.matches.length,
    };
  }, [data, hoy]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  if (!data || !derived) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const d = derived;
  const diasAlProximo = d.proximo?.fecha
    ? Math.round((new Date(d.proximo.fecha).getTime() - new Date(hoy).getTime()) / 86400000)
    : null;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900">Tablero del DT</h2>
        <p className="text-sm capitalize text-slate-400">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Próximo partido */}
        <div className="card relative overflow-hidden p-5 sm:col-span-2 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-celeste-100/60" />
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-celeste-600">
            <CalendarClock className="h-3.5 w-3.5" /> Próximo partido
          </p>
          {d.proximo ? (
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-3xl font-bold text-slate-900">
                  vs {d.proximo.rival}
                </p>
                <p className="mt-1 text-sm text-slate-500">{formatDate(d.proximo.fecha)}</p>
              </div>
              {diasAlProximo != null && (
                <div className="text-right">
                  <p className="tnum font-display text-4xl font-bold text-celeste-600">
                    {diasAlProximo === 0 ? 'HOY' : diasAlProximo}
                  </p>
                  {diasAlProximo > 0 && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {diasAlProximo === 1 ? 'día' : 'días'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                No hay partidos con fecha futura cargados.
              </p>
              <Link to="/estadisticas" className="btn-secondary shrink-0">
                <Plus className="h-4 w-4" /> Cargar
              </Link>
            </div>
          )}
        </div>

        {/* Resumen del plantel */}
        <div className="card p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-celeste-600">
            <Users className="h-3.5 w-3.5" /> El equipo
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Jugadores" value={d.jugadores} />
            <Stat label="Partidos" value={d.partidos} />
            <Stat label="Goles a favor" value={d.gf} />
            <Stat label="En contra" value={d.gc} />
          </div>
          {d.ultimos.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Últimos resultados
              </p>
              <div className="flex gap-1.5">
                {d.ultimos.map((m) => (
                  <ResultChip key={m.id} match={m} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Once probable */}
        <div className="card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-celeste-600">
              <LayoutGrid className="h-3.5 w-3.5" /> Once probable
            </p>
            <Link
              to="/formaciones"
              className="flex items-center text-xs font-semibold text-slate-400 hover:text-celeste-600"
            >
              Editar <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.lastLineup && data.lineupTokens.length > 0 ? (
            <>
              <MiniPitch tokens={data.lineupTokens} />
              <p className="mt-2.5 truncate text-center text-xs font-semibold text-slate-500">
                {data.lastLineup.nombre}
                <span className="ml-1.5 font-normal text-slate-400">
                  ·{' '}
                  {data.lastLineup.formacion === FREE_FORMATION
                    ? 'libre'
                    : data.lastLineup.formacion}
                </span>
              </p>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-slate-400">Todavía no hay alineaciones guardadas.</p>
              <Link to="/formaciones" className="btn-primary">
                <Plus className="h-4 w-4" /> Armar el once
              </Link>
            </div>
          )}
        </div>

        {/* Goleadores */}
        <TopCard
          icon={<Goal className="h-3.5 w-3.5" />}
          title="Goleadores"
          rows={d.goleadores.map((p) => ({ player: p, value: p.total_goles }))}
          unit="goles"
        />

        {/* Asistidores */}
        <TopCard
          icon={<Handshake className="h-3.5 w-3.5" />}
          title="Asistencias"
          rows={d.asistidores.map((p) => ({ player: p, value: p.total_asistencias }))}
          unit="asist."
        />

        {/* Acceso a la pizarra */}
        <Link
          to="/pizarra"
          className="card card-hover group relative flex flex-col justify-between overflow-hidden p-5 sm:col-span-2 lg:col-span-1"
        >
          <div className="pointer-events-none absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-gradient-to-br from-celeste-400/20 to-celeste-600/30 transition-transform duration-500 ease-out-expo group-hover:scale-125" />
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-celeste-600">
            <PenTool className="h-3.5 w-3.5" /> Pizarra táctica
          </p>
          <div className="mt-6 flex items-end justify-between">
            <p className="max-w-[220px] font-display text-xl font-bold leading-snug text-slate-900">
              Dibujá jugadas y mové fichas como un DT profesional
            </p>
            <span className="btn-primary pointer-events-none">
              Abrir <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="tnum font-display text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
    </div>
  );
}

/** Chip G/E/P con letra + color (no color solo). */
function ResultChip({ match }: { match: Match }) {
  const won = match.goles_favor > match.goles_contra;
  const lost = match.goles_favor < match.goles_contra;
  const cls = won
    ? 'bg-emerald-100 text-emerald-700'
    : lost
      ? 'bg-rose-100 text-rose-700'
      : 'bg-slate-100 text-slate-500';
  return (
    <span
      title={`vs ${match.rival} · ${match.goles_favor}-${match.goles_contra}`}
      className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold ${cls}`}
    >
      {won ? 'G' : lost ? 'P' : 'E'}
    </span>
  );
}

function TopCard({
  icon,
  title,
  rows,
  unit,
}: {
  icon: React.ReactNode;
  title: string;
  rows: { player: PlayerSeasonStats; value: number }[];
  unit: string;
}) {
  const hasAny = rows.some((r) => r.value > 0);
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-celeste-600">
          {icon} {title}
        </p>
        <Link
          to="/estadisticas"
          className="flex items-center text-xs font-semibold text-slate-400 hover:text-celeste-600"
        >
          Ver todo <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {!hasAny ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <ClipboardList className="h-6 w-6 text-slate-300" />
          <p className="text-sm text-slate-400">Cargá partidos para ver el ranking.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(({ player: p, value }, i) => (
            <li key={p.id} className="flex items-center gap-3">
              <span
                className={`tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
                  i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i + 1}
              </span>
              <Avatar nombre={p.nombre} apodo={p.apodo} fotoUrl={p.foto_url} size={38} />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                {p.apodo || p.nombre}
              </p>
              <p className="tnum shrink-0 font-display text-lg font-bold text-slate-900">
                {value}
                <span className="ml-1 text-[11px] font-medium text-slate-400">{unit}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
