import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Save,
  Trash2,
  FolderOpen,
  Eraser,
  LayoutGrid,
  Calendar,
  Plus,
  Hand,
  UserPlus,
  Share2,
  MonitorPlay,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Lineup, LineupPosition, Player } from '../types';
import { usePlayers } from '../hooks/usePlayers';
import { FORMATION_NAMES, FREE_FORMATION, getSlots, type Slot } from '../lib/formations';
import { formatDate, todayISO } from '../lib/helpers';
import { FormationField } from '../components/lineups/FormationField';
import {
  FreeFormationField,
  type FreePosition,
} from '../components/lineups/FreeFormationField';
import { PlayerPicker } from '../components/lineups/PlayerPicker';
import { PresentationMode } from '../components/lineups/PresentationMode';
import { ShareLineupModal } from '../components/lineups/ShareLineupModal';
import { Modal } from '../components/Modal';
import { Skeleton, ListSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { toast } from '../components/Toast';

type Tab = 'armar' | 'guardadas';

/** Fila de posición lista para insertar (sin lineup_id). */
interface PositionRow {
  slot_index: number;
  player_id: string;
  x?: number;
  y?: number;
}

export function LineupsPage() {
  const { players, loading: loadingPlayers, error: playersError, reload: reloadPlayers } =
    usePlayers();

  const [tab, setTab] = useState<Tab>('armar');

  // --- Estado del armador ---
  const [formacion, setFormacion] = useState<string>(FORMATION_NAMES[0]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [freePositions, setFreePositions] = useState<FreePosition[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);
  const [freePickerOpen, setFreePickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [presentOpen, setPresentOpen] = useState(false);
  const [presentRival, setPresentRival] = useState('');
  const [notas, setNotas] = useState('');

  // --- Alineaciones guardadas ---
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [lineupsError, setLineupsError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Lineup | null>(null);

  const isFree = formacion === FREE_FORMATION;
  const slots = getSlots(formacion);

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])) as Record<string, Player>,
    [players],
  );

  const assignmentsWithPlayer = useMemo(() => {
    const map: Record<number, Player | undefined> = {};
    for (const [idx, pid] of Object.entries(assignments)) map[+idx] = playersById[pid];
    return map;
  }, [assignments, playersById]);

  const takenByPlayer = useMemo(() => {
    const map: Record<string, number> = {};
    if (isFree) {
      freePositions.forEach((p, i) => (map[p.playerId] = i));
    } else {
      for (const [idx, pid] of Object.entries(assignments)) map[pid] = +idx;
    }
    return map;
  }, [assignments, freePositions, isFree]);

  /** Fichas resueltas (x/y + jugador) del armado actual: para estampa y presentación. */
  const fieldTokens = useMemo(() => {
    if (isFree) {
      return freePositions
        .map((p) => ({ x: p.x, y: p.y, player: playersById[p.playerId] }))
        .filter((t): t is { x: number; y: number; player: Player } => !!t.player);
    }
    return slots
      .filter((s) => assignments[s.index])
      .map((s) => ({ x: s.x, y: s.y, player: playersById[assignments[s.index]] }))
      .filter((t): t is { x: number; y: number; player: Player } => !!t.player);
  }, [isFree, freePositions, assignments, slots, playersById]);

  /** Filas de posiciones según el modo activo (fijo o libre). */
  const positionRows: PositionRow[] = useMemo(
    () =>
      isFree
        ? freePositions.map((p, i) => ({
            slot_index: i,
            player_id: p.playerId,
            x: p.x,
            y: p.y,
          }))
        : Object.entries(assignments).map(([idx, pid]) => ({
            slot_index: +idx,
            player_id: pid,
          })),
    [isFree, freePositions, assignments],
  );

  const loadLineups = useCallback(async () => {
    setLoadingLineups(true);
    setLineupsError(null);
    const { data, error } = await supabase
      .from('lineups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setLineupsError('No se pudieron cargar las alineaciones.');
      console.error(error);
    } else {
      setLineups((data ?? []) as Lineup[]);
    }
    setLoadingLineups(false);
  }, []);

  useEffect(() => {
    void loadLineups();
  }, [loadLineups]);

  function changeFormation(f: string) {
    if (f === FREE_FORMATION) {
      // Al pasar a libre, se arranca con los jugadores ya asignados en sus puestos.
      if (freePositions.length === 0 && Object.keys(assignments).length > 0) {
        const seed: FreePosition[] = [];
        for (const [idx, pid] of Object.entries(assignments)) {
          const s = slots.find((sl) => sl.index === +idx);
          if (s) seed.push({ playerId: pid, x: s.x, y: s.y });
        }
        setFreePositions(seed);
      }
      setFormacion(f);
      return;
    }
    setFormacion(f);
    // Se conservan las asignaciones que sigan teniendo un puesto válido.
    setAssignments((prev) => {
      const max = getSlots(f).length;
      const next: Record<number, string> = {};
      for (const [idx, pid] of Object.entries(prev)) if (+idx < max) next[+idx] = pid;
      return next;
    });
  }

  function assignPlayer(slotIndex: number, playerId: string | null) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (playerId === null) {
        delete next[slotIndex];
        return next;
      }
      // Un jugador no puede estar en dos puestos: lo quitamos de cualquier otro.
      for (const k of Object.keys(next)) if (next[+k] === playerId) delete next[+k];
      next[slotIndex] = playerId;
      return next;
    });
    setPickerSlot(null);
  }

  // --- Modo libre ---
  function addFreePlayer(playerId: string) {
    setFreePositions((prev) => {
      // Entra cerca del centro, con un pequeño corrimiento para no encimarse.
      const n = prev.length;
      const x = 30 + (n % 3) * 20;
      const y = 40 + (Math.floor(n / 3) % 4) * 12;
      return [...prev, { playerId, x, y }];
    });
    setFreePickerOpen(false);
  }

  function moveFreePlayer(playerId: string, x: number, y: number) {
    setFreePositions((prev) => prev.map((p) => (p.playerId === playerId ? { ...p, x, y } : p)));
  }

  function removeFreePlayer(playerId: string) {
    setFreePositions((prev) => prev.filter((p) => p.playerId !== playerId));
  }

  function resetBuilder() {
    setAssignments({});
    setFreePositions([]);
    setEditingId(null);
    setFormacion(FORMATION_NAMES[0]);
    setNotas('');
    setPresentRival('');
  }

  async function openLineup(l: Lineup) {
    const { data, error } = await supabase
      .from('lineup_positions')
      .select('*')
      .eq('lineup_id', l.id);
    if (error) {
      toast('No se pudo abrir la alineación.', 'error');
      console.error(error);
      return;
    }
    const rows = (data ?? []) as LineupPosition[];
    if (l.formacion === FREE_FORMATION) {
      setFreePositions(
        rows
          .filter((r) => r.player_id)
          .map((r) => ({
            playerId: r.player_id!,
            x: Number(r.x ?? 50),
            y: Number(r.y ?? 50),
          })),
      );
      setAssignments({});
    } else {
      const next: Record<number, string> = {};
      for (const pos of rows) if (pos.player_id) next[pos.slot_index] = pos.player_id;
      setAssignments(next);
      setFreePositions([]);
    }
    setFormacion(l.formacion);
    setEditingId(l.id);
    setNotas(l.notas ?? '');
    setTab('armar');
  }

  /** Al salir de la presentación, persiste las consignas si hay alineación guardada. */
  function closePresentation() {
    setPresentOpen(false);
    if (editingId) {
      void supabase
        .from('lineups')
        .update({ notas: notas || null })
        .eq('id', editingId)
        .then(({ error }) => {
          if (error) console.error(error);
        });
    }
  }

  async function deleteLineup() {
    if (!deleting) return;
    const { error } = await supabase.from('lineups').delete().eq('id', deleting.id);
    if (error) {
      toast('No se pudo eliminar la alineación.', 'error');
      console.error(error);
      return;
    }
    if (editingId === deleting.id) resetBuilder();
    setDeleting(null);
    toast('Alineación eliminada');
    void loadLineups();
  }

  if (loadingPlayers) {
    return (
      <div>
        <PageHeader />
        <div className="mx-auto w-full max-w-md pt-2">
          <Skeleton className="aspect-[2/3] w-full rounded-[1.5rem]" />
        </div>
      </div>
    );
  }
  if (playersError) return <ErrorState message={playersError} onRetry={reloadPlayers} />;

  const formationChip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 font-display text-sm font-bold transition-all duration-200 ease-out-expo ${
      active
        ? 'bg-celeste-500 text-white shadow-glow'
        : 'border border-slate-200 bg-white text-slate-600 shadow-card hover:border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <div>
      <PageHeader />

      {/* Tabs */}
      <div className="seg mb-5 grid-cols-2">
        <button
          onClick={() => setTab('armar')}
          className={`seg-item ${tab === 'armar' ? 'seg-item-active' : ''}`}
        >
          Armar
        </button>
        <button
          onClick={() => setTab('guardadas')}
          className={`seg-item ${tab === 'guardadas' ? 'seg-item-active' : ''}`}
        >
          Guardadas ({lineups.length})
        </button>
      </div>

      {tab === 'armar' ? (
        <div className="space-y-4">
          {players.length === 0 && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No hay jugadores en el plantel todavía. Agregá jugadores para poder asignarlos.
            </div>
          )}

          {editingId && (
            <div className="flex animate-fade-in items-center justify-between rounded-xl bg-celeste-50 px-4 py-2.5 text-sm text-celeste-700">
              <span>Editando una alineación guardada.</span>
              <button onClick={resetBuilder} className="font-semibold underline">
                Nueva
              </button>
            </div>
          )}

          {/* Selector de formación */}
          <div>
            <p className="label">Formación</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {FORMATION_NAMES.map((f) => (
                <button key={f} onClick={() => changeFormation(f)} className={formationChip(formacion === f)}>
                  {f}
                </button>
              ))}
              <button
                onClick={() => changeFormation(FREE_FORMATION)}
                className={formationChip(isFree)}
                title="Ubicá a cada jugador donde quieras"
              >
                <Hand className="h-4 w-4" />
                Libre
              </button>
            </div>
          </div>

          {isFree ? (
            <FreeFormationField
              positions={freePositions}
              playersById={playersById}
              onMove={moveFreePlayer}
              onRemove={removeFreePlayer}
            />
          ) : (
            <FormationField
              slots={slots}
              assignments={assignmentsWithPlayer}
              onSlotClick={(s) => players.length > 0 && setPickerSlot(s)}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="tnum text-sm text-slate-400">
              {isFree
                ? `${freePositions.length} ${freePositions.length === 1 ? 'jugador' : 'jugadores'} en cancha`
                : `${positionRows.length}/${slots.length} puestos asignados`}
            </p>
            <div className="flex gap-2">
              {isFree && (
                <button
                  onClick={() => setFreePickerOpen(true)}
                  disabled={players.length === 0 || freePositions.length >= players.length}
                  className="btn-secondary"
                >
                  <UserPlus className="h-4 w-4" />
                  Agregar
                </button>
              )}
              <button
                onClick={() => setShareOpen(true)}
                disabled={fieldTokens.length === 0}
                className="btn-secondary"
                title="Estampa del once (imagen para compartir)"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Estampa</span>
              </button>
              <button
                onClick={() => setPresentOpen(true)}
                disabled={fieldTokens.length === 0}
                className="btn-secondary"
                title="Modo presentación (pantalla completa)"
              >
                <MonitorPlay className="h-4 w-4" />
                <span className="hidden sm:inline">Presentar</span>
              </button>
              <button onClick={resetBuilder} className="btn-ghost" title="Limpiar">
                <Eraser className="h-4 w-4" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
              <button
                onClick={() => setSaveOpen(true)}
                disabled={positionRows.length === 0}
                className="btn-primary"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <SavedLineups
          lineups={lineups}
          loading={loadingLineups}
          error={lineupsError}
          onRetry={loadLineups}
          onOpen={openLineup}
          onDelete={setDeleting}
          onGoBuild={() => setTab('armar')}
        />
      )}

      {/* Picker para puestos fijos */}
      <PlayerPicker
        open={!!pickerSlot}
        slot={pickerSlot}
        players={players}
        takenByPlayer={takenByPlayer}
        currentPlayerId={pickerSlot ? (assignments[pickerSlot.index] ?? null) : null}
        onPick={(pid) => pickerSlot && assignPlayer(pickerSlot.index, pid)}
        onClose={() => setPickerSlot(null)}
      />

      {/* Picker para agregar en modo libre */}
      <PlayerPicker
        open={freePickerOpen}
        slot={null}
        title="Agregar a la cancha"
        players={players}
        takenByPlayer={takenByPlayer}
        currentPlayerId={null}
        onPick={(pid) => pid && addFreePlayer(pid)}
        onClose={() => setFreePickerOpen(false)}
      />

      {/* Guardar alineación */}
      <SaveLineupModal
        open={saveOpen}
        editingId={editingId}
        formacion={formacion}
        rows={positionRows}
        existing={lineups.find((l) => l.id === editingId) ?? null}
        onClose={() => setSaveOpen(false)}
        onSaved={(id) => {
          setSaveOpen(false);
          setEditingId(id);
          toast('Alineación guardada');
          void loadLineups();
        }}
      />

      {/* Estampa del once para compartir */}
      <ShareLineupModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        tokens={fieldTokens}
        defaultFecha={lineups.find((l) => l.id === editingId)?.fecha ?? null}
      />

      {/* Modo presentación / TV */}
      <PresentationMode
        open={presentOpen}
        onClose={closePresentation}
        tokens={fieldTokens}
        formacionLabel={isFree ? 'Libre' : formacion}
        rival={presentRival}
        onRivalChange={setPresentRival}
        fecha={
          editingId
            ? formatDate(lineups.find((l) => l.id === editingId)?.fecha ?? null)
            : null
        }
        notas={notas}
        onNotasChange={setNotas}
      />

      {/* Confirmar borrado de alineación */}
      <Modal
        open={!!deleting}
        title="Eliminar alineación"
        onClose={() => setDeleting(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={deleteLineup} className="btn-danger">
              Sí, eliminar
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Eliminar la alineación <span className="font-semibold">{deleting?.nombre}</span>?
        </p>
      </Modal>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-bold text-slate-900">Formaciones</h2>
      <p className="text-sm text-slate-400">
        Elegí un esquema o armá una formación libre, y guardala para reutilizarla.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lista de alineaciones guardadas
// ---------------------------------------------------------------------------
function SavedLineups({
  lineups,
  loading,
  error,
  onRetry,
  onOpen,
  onDelete,
  onGoBuild,
}: {
  lineups: Lineup[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (l: Lineup) => void;
  onDelete: (l: Lineup) => void;
  onGoBuild: () => void;
}) {
  if (loading) return <ListSkeleton rows={3} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (lineups.length === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid className="h-7 w-7" />}
        title="No hay alineaciones guardadas"
        description="Armá una formación y guardala para verla acá."
        action={
          <button onClick={onGoBuild} className="btn-primary">
            <Plus className="h-4 w-4" /> Armar alineación
          </button>
        }
      />
    );
  }

  return (
    <ul className="stagger space-y-2.5">
      {lineups.map((l) => {
        const esLibre = l.formacion === FREE_FORMATION;
        return (
          <li key={l.id} className="card card-hover flex items-center gap-3 p-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display font-bold ${
                esLibre
                  ? 'bg-slate-900 text-amber-300 text-[10px] uppercase tracking-wide'
                  : 'bg-celeste-50 text-sm text-celeste-600'
              }`}
            >
              {esLibre ? 'Libre' : l.formacion}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{l.nombre}</p>
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="h-3 w-3" /> {formatDate(l.fecha)}
              </p>
            </div>
            <button onClick={() => onOpen(l)} className="btn-secondary" title="Abrir">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Abrir</span>
            </button>
            <button
              onClick={() => onDelete(l)}
              className="btn-ghost text-red-500 hover:bg-red-50"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Modal para guardar (nombre + fecha) y persistir en Supabase
// ---------------------------------------------------------------------------
function SaveLineupModal({
  open,
  editingId,
  formacion,
  rows,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingId: string | null;
  formacion: string;
  rows: PositionRow[];
  existing: Lineup | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Precarga datos al abrir.
  useEffect(() => {
    if (open) {
      setNombre(existing?.nombre ?? '');
      setFecha(existing?.fecha ?? todayISO());
      setError(null);
    }
  }, [open, existing]);

  async function save() {
    if (!nombre.trim()) {
      setError('Ponele un nombre a la alineación.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let lineupId = editingId;

      if (editingId) {
        const { error: err } = await supabase
          .from('lineups')
          .update({ nombre: nombre.trim(), formacion, fecha })
          .eq('id', editingId);
        if (err) throw err;
        // Reemplaza las posiciones.
        const { error: delErr } = await supabase
          .from('lineup_positions')
          .delete()
          .eq('lineup_id', editingId);
        if (delErr) throw delErr;
      } else {
        const { data, error: err } = await supabase
          .from('lineups')
          .insert({ nombre: nombre.trim(), formacion, fecha })
          .select('id')
          .single();
        if (err) throw err;
        lineupId = data.id;
      }

      if (rows.length > 0) {
        const { error: posErr } = await supabase
          .from('lineup_positions')
          .insert(rows.map((r) => ({ ...r, lineup_id: lineupId })));
        if (posErr) throw posErr;
      }

      onSaved(lineupId!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la alineación.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editingId ? 'Guardar cambios' : 'Guardar alineación'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="lineup-nombre">
            Nombre
          </label>
          <input
            id="lineup-nombre"
            className="input"
            placeholder="ej: vs Rival X - fecha 5"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="lineup-fecha">
            Fecha
          </label>
          <input
            id="lineup-fecha"
            type="date"
            className="input"
            value={fecha ?? ''}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-400">
          Formación{' '}
          <span className="font-semibold text-slate-600">
            {formacion === FREE_FORMATION ? 'Libre' : formacion}
          </span>{' '}
          · <span className="tnum">{rows.length}</span> jugadores asignados
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
