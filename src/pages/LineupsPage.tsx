import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Trash2, FolderOpen, Eraser, LayoutGrid, Calendar, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Lineup, LineupPosition, Player } from '../types';
import { usePlayers } from '../hooks/usePlayers';
import { FORMATION_NAMES, getSlots, type Slot } from '../lib/formations';
import { formatDate, todayISO } from '../lib/helpers';
import { FormationField } from '../components/lineups/FormationField';
import { PlayerPicker } from '../components/lineups/PlayerPicker';
import { Modal } from '../components/Modal';
import { LoadingState } from '../components/Spinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

type Tab = 'armar' | 'guardadas';

export function LineupsPage() {
  const { players, loading: loadingPlayers, error: playersError, reload: reloadPlayers } =
    usePlayers();

  const [tab, setTab] = useState<Tab>('armar');

  // --- Estado del armador ---
  const [formacion, setFormacion] = useState<string>(FORMATION_NAMES[0]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);

  // --- Alineaciones guardadas ---
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [loadingLineups, setLoadingLineups] = useState(true);
  const [lineupsError, setLineupsError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Lineup | null>(null);

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
    for (const [idx, pid] of Object.entries(assignments)) map[pid] = +idx;
    return map;
  }, [assignments]);

  const assignedCount = Object.keys(assignments).length;

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

  function resetBuilder() {
    setAssignments({});
    setEditingId(null);
    setFormacion(FORMATION_NAMES[0]);
  }

  async function openLineup(l: Lineup) {
    const { data, error } = await supabase
      .from('lineup_positions')
      .select('*')
      .eq('lineup_id', l.id);
    if (error) {
      alert('No se pudo abrir la alineación.');
      console.error(error);
      return;
    }
    const next: Record<number, string> = {};
    for (const pos of (data ?? []) as LineupPosition[]) {
      if (pos.player_id) next[pos.slot_index] = pos.player_id;
    }
    setFormacion(l.formacion);
    setAssignments(next);
    setEditingId(l.id);
    setTab('armar');
  }

  async function deleteLineup() {
    if (!deleting) return;
    const { error } = await supabase.from('lineups').delete().eq('id', deleting.id);
    if (error) {
      alert('No se pudo eliminar la alineación.');
      console.error(error);
      return;
    }
    if (editingId === deleting.id) resetBuilder();
    setDeleting(null);
    void loadLineups();
  }

  if (loadingPlayers) return <LoadingState label="Cargando…" />;
  if (playersError) return <ErrorState message={playersError} onRetry={reloadPlayers} />;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-extrabold text-slate-800">Formaciones</h2>
        <p className="text-sm text-slate-400">Armá la alineación y guardala para reutilizarla.</p>
      </div>

      {/* Tabs */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab('armar')}
          className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'armar' ? 'bg-white text-celeste-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          Armar
        </button>
        <button
          onClick={() => setTab('guardadas')}
          className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'guardadas' ? 'bg-white text-celeste-600 shadow-sm' : 'text-slate-500'
          }`}
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
            <div className="flex items-center justify-between rounded-xl bg-celeste-50 px-4 py-2.5 text-sm text-celeste-700">
              <span>Editando una alineación guardada.</span>
              <button onClick={resetBuilder} className="font-semibold underline">
                Nueva
              </button>
            </div>
          )}

          {/* Selector de formación */}
          <div>
            <p className="label">Formación</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {FORMATION_NAMES.map((f) => (
                <button
                  key={f}
                  onClick={() => changeFormation(f)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                    formacion === f
                      ? 'bg-celeste-500 text-white shadow'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <FormationField
            slots={slots}
            assignments={assignmentsWithPlayer}
            onSlotClick={(s) => players.length > 0 && setPickerSlot(s)}
          />

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {assignedCount}/{slots.length} puestos asignados
            </p>
            <div className="flex gap-2">
              <button onClick={resetBuilder} className="btn-secondary" title="Limpiar">
                <Eraser className="h-4 w-4" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
              <button
                onClick={() => setSaveOpen(true)}
                disabled={assignedCount === 0}
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

      {/* Picker de jugador */}
      <PlayerPicker
        open={!!pickerSlot}
        slot={pickerSlot}
        players={players}
        takenByPlayer={takenByPlayer}
        currentPlayerId={pickerSlot ? (assignments[pickerSlot.index] ?? null) : null}
        onPick={(pid) => pickerSlot && assignPlayer(pickerSlot.index, pid)}
        onClose={() => setPickerSlot(null)}
      />

      {/* Guardar alineación */}
      <SaveLineupModal
        open={saveOpen}
        editingId={editingId}
        formacion={formacion}
        assignments={assignments}
        existing={lineups.find((l) => l.id === editingId) ?? null}
        onClose={() => setSaveOpen(false)}
        onSaved={(id) => {
          setSaveOpen(false);
          setEditingId(id);
          void loadLineups();
        }}
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
  if (loading) return <LoadingState label="Cargando alineaciones…" />;
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
    <ul className="space-y-2.5">
      {lineups.map((l) => (
        <li key={l.id} className="card flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-celeste-50 text-sm font-black text-celeste-600">
            {l.formacion}
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
      ))}
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
  assignments,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingId: string | null;
  formacion: string;
  assignments: Record<number, string>;
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

      const rows = Object.entries(assignments).map(([idx, pid]) => ({
        lineup_id: lineupId,
        slot_index: Number(idx),
        player_id: pid,
      }));
      if (rows.length > 0) {
        const { error: posErr } = await supabase.from('lineup_positions').insert(rows);
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
          Formación <span className="font-semibold text-slate-600">{formacion}</span> ·{' '}
          {Object.keys(assignments).length} jugadores asignados
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
