import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Eraser,
  FolderOpen,
  ImageDown,
  LayoutGrid,
  Move,
  Save,
  Spline,
  Trash2,
  Undo2,
  UserPlus,
  Waves,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Board, BoardStroke, BoardToken, Lineup, LineupPosition, Player } from '../types';
import { usePlayers } from '../hooks/usePlayers';
import { FREE_FORMATION, getSlots } from '../lib/formations';
import { formatDate } from '../lib/helpers';
import { Pitch } from '../components/lineups/Pitch';
import { PlayerToken } from '../components/lineups/PlayerToken';
import { PlayerPicker } from '../components/lineups/PlayerPicker';
import { Modal } from '../components/Modal';
import { Skeleton, ListSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { toast } from '../components/Toast';
import { exportBoardImage, shareOrDownload, type ExportToken } from '../lib/canvas-export';

type Tool = 'move' | 'arrow' | 'pass' | 'press' | 'erase';

const COLORS = ['#fde047', '#ffffff', '#f87171', '#38bdf8', '#0f172a'];
const TOOLS: { id: Tool; icon: typeof Move; label: string }[] = [
  { id: 'move', icon: Move, label: 'Mover' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Flecha' },
  { id: 'pass', icon: Spline, label: 'Pase' },
  { id: 'press', icon: Waves, label: 'Presión' },
  { id: 'erase', icon: Eraser, label: 'Borrar' },
];

const clamp = (v: number, min = 3, max = 97) => Math.min(max, Math.max(min, v));

/** setPointerCapture puede fallar en algunos dispositivos; no debe romper el gesto. */
function capture(e: React.PointerEvent) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    /* continuar sin captura */
  }
}

export function BoardPage() {
  const { players, loading: loadingPlayers, error: playersError, reload } = usePlayers();

  const [tokens, setTokens] = useState<BoardToken[]>([]);
  const [strokes, setStrokes] = useState<BoardStroke[]>([]);
  const [tool, setTool] = useState<Tool>('move');
  const [color, setColor] = useState(COLORS[0]);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('');

  // Trazo en curso
  const [draft, setDraft] = useState<{ x: number; y: number }[] | null>(null);
  // Drag de ficha en curso
  const [drag, setDrag] = useState<BoardToken | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragMoved = useRef(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [boardsOpen, setBoardsOpen] = useState(false);
  const [lineupsOpen, setLineupsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])) as Record<string, Player>,
    [players],
  );

  const takenByPlayer = useMemo(() => {
    const map: Record<string, number> = {};
    tokens.forEach((t, i) => (map[t.playerId] = i));
    return map;
  }, [tokens]);

  // -------------------------------------------------------------------------
  // Coordenadas
  // -------------------------------------------------------------------------
  function toField(e: React.PointerEvent): { x: number; y: number } | null {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  }

  // -------------------------------------------------------------------------
  // Dibujo (flechas / pases / presión)
  // -------------------------------------------------------------------------
  const isDrawTool = tool === 'arrow' || tool === 'pass' || tool === 'press';

  function fieldDown(e: React.PointerEvent) {
    if (!isDrawTool) return;
    e.preventDefault();
    capture(e);
    const p = toField(e);
    if (p) setDraft([p]);
  }

  function fieldMove(e: React.PointerEvent) {
    if (!isDrawTool || !draft) return;
    const p = toField(e);
    if (!p) return;
    const last = draft[draft.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return;
    setDraft([...draft, p]);
  }

  function fieldUp() {
    if (!isDrawTool || !draft) return;
    if (draft.length >= 2) {
      setStrokes((prev) => [...prev, { kind: tool as BoardStroke['kind'], color, points: draft }]);
    }
    setDraft(null);
  }

  // -------------------------------------------------------------------------
  // Fichas (drag con Pointer Events, mismo patrón que la formación libre)
  // -------------------------------------------------------------------------
  function tokenDown(e: React.PointerEvent, t: BoardToken) {
    if (tool !== 'move') return;
    e.preventDefault();
    e.stopPropagation();
    capture(e);
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragMoved.current = false;
    setDrag(t);
  }

  function tokenMove(e: React.PointerEvent, playerId: string) {
    if (!drag || drag.playerId !== playerId || !dragStart.current) return;
    if (
      !dragMoved.current &&
      Math.abs(e.clientX - dragStart.current.x) < 6 &&
      Math.abs(e.clientY - dragStart.current.y) < 6
    ) {
      return;
    }
    const p = toField(e);
    if (!p) return;
    dragMoved.current = true;
    setDrag({ playerId, ...p });
  }

  function tokenUp(playerId: string) {
    if (!drag || drag.playerId !== playerId) return;
    if (dragMoved.current) {
      const { x, y } = drag;
      setTokens((prev) =>
        prev.map((t) =>
          t.playerId === playerId
            ? { ...t, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
            : t,
        ),
      );
      setSelected(null);
    } else {
      setSelected((cur) => (cur === playerId ? null : playerId));
    }
    setDrag(null);
    dragStart.current = null;
  }

  function addToken(playerId: string) {
    setTokens((prev) => {
      const n = prev.length;
      return [...prev, { playerId, x: 25 + (n % 4) * 16, y: 38 + (Math.floor(n / 4) % 4) * 13 }];
    });
    setPickerOpen(false);
  }

  // -------------------------------------------------------------------------
  // Cargar desde una alineación guardada
  // -------------------------------------------------------------------------
  async function loadFromLineup(l: Lineup) {
    const { data, error } = await supabase
      .from('lineup_positions')
      .select('*')
      .eq('lineup_id', l.id);
    if (error) {
      toast('No se pudo cargar la alineación.', 'error');
      return;
    }
    const rows = (data ?? []) as LineupPosition[];
    const slots = getSlots(l.formacion);
    const next: BoardToken[] = rows
      .filter((r) => r.player_id && playersById[r.player_id])
      .map((r) => {
        if (l.formacion === FREE_FORMATION) {
          return { playerId: r.player_id!, x: Number(r.x ?? 50), y: Number(r.y ?? 50) };
        }
        const s = slots.find((sl) => sl.index === r.slot_index);
        return { playerId: r.player_id!, x: s?.x ?? 50, y: s?.y ?? 50 };
      });
    setTokens(next);
    setLineupsOpen(false);
    toast(`Fichas cargadas de "${l.nombre}"`);
  }

  // -------------------------------------------------------------------------
  // Guardar / abrir pizarras
  // -------------------------------------------------------------------------
  async function saveBoard(nombre: string) {
    const data = { tokens, strokes };
    if (boardId) {
      const { error } = await supabase
        .from('boards')
        .update({ nombre, data, updated_at: new Date().toISOString() })
        .eq('id', boardId);
      if (error) throw error;
    } else {
      const { data: row, error } = await supabase
        .from('boards')
        .insert({ nombre, data })
        .select('id')
        .single();
      if (error) throw error;
      setBoardId(row.id);
    }
    setBoardName(nombre);
    toast('Pizarra guardada');
  }

  function openBoard(b: Board) {
    setTokens(b.data.tokens ?? []);
    setStrokes(b.data.strokes ?? []);
    setBoardId(b.id);
    setBoardName(b.nombre);
    setBoardsOpen(false);
  }

  function resetBoard() {
    setTokens([]);
    setStrokes([]);
    setBoardId(null);
    setBoardName('');
    setSelected(null);
  }

  async function doExport() {
    setExporting(true);
    try {
      const exportTokens: ExportToken[] = tokens
        .filter((t) => playersById[t.playerId])
        .map((t) => {
          const p = playersById[t.playerId];
          return {
            x: t.x,
            y: t.y,
            nombre: p.apodo || p.nombre.split(' ')[0],
            numero: p.numero,
            fotoUrl: p.foto_url,
            isDt: p.posicion === 'dt',
          };
        });
      const blob = await exportBoardImage({
        tokens: exportTokens,
        strokes,
        nombre: boardName || undefined,
      });
      const res = await shareOrDownload(blob, `caos-pizarra-${Date.now()}.png`);
      toast(res === 'shared' ? 'Pizarra compartida' : 'Imagen descargada');
    } catch (err) {
      console.error(err);
      toast('No se pudo exportar la imagen.', 'error');
    } finally {
      setExporting(false);
    }
  }

  if (loadingPlayers) {
    return (
      <div className="mx-auto w-full max-w-md">
        <Skeleton className="mb-4 h-9 w-48" />
        <Skeleton className="aspect-[2/3] w-full rounded-[1.5rem]" />
      </div>
    );
  }
  if (playersError) return <ErrorState message={playersError} onRetry={reload} />;

  return (
    <div>
      {/* Header de la página */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pizarra táctica</h2>
          <p className="text-sm text-slate-400">
            {boardName ? (
              <>
                Editando <span className="font-semibold text-slate-600">{boardName}</span>
              </>
            ) : (
              'Mové fichas, dibujá jugadas y guardá la pizarra.'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBoardsOpen(true)} className="btn-secondary" title="Mis pizarras">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Abrir</span>
          </button>
          <button
            onClick={doExport}
            disabled={exporting || (tokens.length === 0 && strokes.length === 0)}
            className="btn-secondary"
            title="Exportar imagen"
          >
            <ImageDown className="h-4 w-4" />
            <span className="hidden sm:inline">{exporting ? 'Generando…' : 'Imagen'}</span>
          </button>
          <button
            onClick={() => setSaveOpen(true)}
            disabled={tokens.length === 0 && strokes.length === 0}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </div>

      {/* Acciones de fichas */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setPickerOpen(true)} disabled={players.length === 0} className="btn-secondary">
          <UserPlus className="h-4 w-4" /> Agregar jugador
        </button>
        <button onClick={() => setLineupsOpen(true)} className="btn-secondary">
          <LayoutGrid className="h-4 w-4" /> Desde alineación
        </button>
        {(tokens.length > 0 || strokes.length > 0) && (
          <button onClick={resetBoard} className="btn-ghost text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Vaciar
          </button>
        )}
      </div>

      {/* Cancha */}
      <div className="mx-auto aspect-[2/3] w-full max-w-md lg:h-[calc(100dvh-330px)] lg:w-auto lg:max-w-none">
        <Pitch fieldRef={fieldRef}>
          {/* Capa de dibujo */}
          <svg
            viewBox="0 0 100 150"
            preserveAspectRatio="none"
            className={`absolute inset-0 h-full w-full ${
              isDrawTool ? 'cursor-crosshair touch-none' : 'pointer-events-none'
            }`}
            onPointerDown={fieldDown}
            onPointerMove={fieldMove}
            onPointerUp={fieldUp}
            onPointerCancel={() => setDraft(null)}
          >
            {strokes.map((s, i) => (
              <StrokePath
                key={i}
                stroke={s}
                erasable={tool === 'erase'}
                onErase={() => setStrokes((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
            {draft && draft.length > 1 && (
              <StrokePath stroke={{ kind: tool as BoardStroke['kind'], color, points: draft }} />
            )}
          </svg>

          {/* Fichas */}
          {tokens.map((t) => {
            const player = playersById[t.playerId];
            if (!player) return null;
            const isDragging = drag?.playerId === t.playerId;
            const cur = isDragging ? drag : t;
            const isSelected = selected === t.playerId && tool === 'move';
            return (
              <div
                key={t.playerId}
                style={{ left: `${cur.x}%`, top: `${cur.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                  tool === 'move' ? 'touch-none' : 'pointer-events-none'
                } ${
                  isDragging
                    ? 'z-20 cursor-grabbing'
                    : 'z-0 cursor-grab transition-[left,top] duration-300 ease-out-expo'
                } ${isSelected ? 'z-10' : ''}`}
                onPointerDown={(e) => tokenDown(e, t)}
                onPointerMove={(e) => tokenMove(e, t.playerId)}
                onPointerUp={() => tokenUp(t.playerId)}
                onPointerCancel={() => setDrag(null)}
              >
                <PlayerToken player={player} isDt={player.posicion === 'dt'} dragging={isDragging} />
                {isSelected && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(null);
                      setTokens((prev) => prev.filter((x) => x.playerId !== t.playerId));
                    }}
                    className="absolute -right-2 -top-2 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lift transition-transform active:scale-90"
                    aria-label="Quitar de la pizarra"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </Pitch>
      </div>

      {/* Barra de herramientas */}
      <div className="mx-auto mt-3 w-full max-w-md lg:max-w-lg">
        <div className="card flex flex-wrap items-center justify-center gap-1.5 p-2">
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                setTool(id);
                setSelected(null);
              }}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
                tool === id
                  ? 'bg-celeste-500 text-white shadow-glow'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title={label}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}

          <span className="mx-1 h-8 w-px bg-slate-200" />

          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full ring-2 ring-offset-1 transition-transform ${
                color === c ? 'scale-110 ring-celeste-500' : 'ring-slate-200'
              }`}
              aria-label={`Color ${c}`}
            />
          ))}

          <span className="mx-1 h-8 w-px bg-slate-200" />

          <button
            onClick={() => setStrokes((prev) => prev.slice(0, -1))}
            disabled={strokes.length === 0}
            className="btn-ghost px-2.5 py-1.5"
            title="Deshacer último trazo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setStrokes([])}
            disabled={strokes.length === 0}
            className="btn-ghost px-2.5 py-1.5 text-red-500 hover:bg-red-50"
            title="Borrar todos los trazos"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {tool === 'erase' && (
          <p className="mt-2 animate-fade-in text-center text-xs text-slate-400">
            Tocá un trazo para borrarlo.
          </p>
        )}
      </div>

      {/* Agregar jugador */}
      <PlayerPicker
        open={pickerOpen}
        slot={null}
        title="Agregar a la pizarra"
        players={players}
        takenByPlayer={takenByPlayer}
        currentPlayerId={null}
        onPick={(pid) => pid && addToken(pid)}
        onClose={() => setPickerOpen(false)}
      />

      <SaveBoardModal
        open={saveOpen}
        initialName={boardName}
        onClose={() => setSaveOpen(false)}
        onSave={async (nombre) => {
          await saveBoard(nombre);
          setSaveOpen(false);
        }}
      />

      <BoardsModal open={boardsOpen} onClose={() => setBoardsOpen(false)} onOpen={openBoard} />

      <LineupsModal
        open={lineupsOpen}
        onClose={() => setLineupsOpen(false)}
        onPick={loadFromLineup}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trazo SVG (con suavizado y punta de flecha)
// ---------------------------------------------------------------------------
function StrokePath({
  stroke,
  erasable,
  onErase,
}: {
  stroke: BoardStroke;
  erasable?: boolean;
  onErase?: () => void;
}) {
  const pts = stroke.points.map((p) => ({ x: p.x, y: p.y * 1.5 })); // viewBox 100x150
  if (pts.length < 2) return null;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length < 3) {
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  }

  // Punta de flecha
  let head: string | null = null;
  if (stroke.kind !== 'press') {
    const a = pts[Math.max(0, pts.length - 3)];
    const b = pts[pts.length - 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const size = 3.4;
    const p1 = {
      x: b.x - size * Math.cos(ang - Math.PI / 6),
      y: b.y - size * Math.sin(ang - Math.PI / 6),
    };
    const p2 = {
      x: b.x - size * Math.cos(ang + Math.PI / 6),
      y: b.y - size * Math.sin(ang + Math.PI / 6),
    };
    head = `${b.x},${b.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
  }

  const width = stroke.kind === 'press' ? 2.8 : 0.9;

  return (
    <g
      onPointerDown={
        erasable && onErase
          ? (e) => {
              e.stopPropagation();
              onErase();
            }
          : undefined
      }
      className={erasable ? 'cursor-pointer' : undefined}
      style={erasable ? { pointerEvents: 'all' } : undefined}
    >
      {/* zona de toque amplia para borrar */}
      {erasable && <path d={d} fill="none" stroke="transparent" strokeWidth={6} />}
      <path
        d={d}
        fill="none"
        stroke={stroke.color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={stroke.kind === 'pass' ? '2.2 1.9' : undefined}
        opacity={stroke.kind === 'press' ? 0.45 : 1}
      />
      {head && <polygon points={head} fill={stroke.color} />}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Modal: guardar pizarra
// ---------------------------------------------------------------------------
function SaveBoardModal({
  open,
  initialName,
  onClose,
  onSave,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (nombre: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNombre(initialName);
      setError(null);
    }
  }, [open, initialName]);

  async function submit() {
    if (!nombre.trim()) {
      setError('Ponele un nombre a la pizarra.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(nombre.trim());
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar. ¿Corriste la migración add-pizarra.sql en Supabase?');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Guardar pizarra"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <label className="label" htmlFor="board-name">
        Nombre
      </label>
      <input
        id="board-name"
        className="input"
        placeholder="ej: Córner ofensivo vs Rival X"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        autoFocus
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal: abrir pizarras guardadas
// ---------------------------------------------------------------------------
function BoardsModal({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (b: Board) => void;
}) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error(error);
      toast('No se pudieron cargar las pizarras.', 'error');
    } else {
      setBoards((data ?? []) as Board[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function remove(b: Board) {
    const { error } = await supabase.from('boards').delete().eq('id', b.id);
    if (error) {
      toast('No se pudo eliminar.', 'error');
      return;
    }
    toast('Pizarra eliminada');
    void load();
  }

  return (
    <Modal open={open} title="Mis pizarras" onClose={onClose}>
      {loading ? (
        <ListSkeleton rows={3} />
      ) : boards.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Todavía no guardaste ninguna pizarra.
        </p>
      ) : (
        <ul className="space-y-2">
          {boards.map((b) => (
            <li key={b.id} className="flex items-center gap-2">
              <button
                onClick={() => onOpen(b)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-celeste-300 hover:bg-celeste-50/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-celeste-50 text-celeste-600">
                  <LayoutGrid className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {b.nombre}
                  </span>
                  <span className="tnum block text-xs text-slate-400">
                    {b.data.tokens?.length ?? 0} fichas · {b.data.strokes?.length ?? 0} trazos
                  </span>
                </span>
              </button>
              <button
                onClick={() => remove(b)}
                className="btn-ghost px-2.5 text-red-500 hover:bg-red-50"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal: cargar fichas desde una alineación guardada
// ---------------------------------------------------------------------------
function LineupsModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (l: Lineup) => void;
}) {
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('lineups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        toast('No se pudieron cargar las alineaciones.', 'error');
      } else {
        setLineups((data ?? []) as Lineup[]);
      }
      setLoading(false);
    })();
  }, [open]);

  return (
    <Modal open={open} title="Cargar desde alineación" onClose={onClose}>
      {loading ? (
        <ListSkeleton rows={3} />
      ) : lineups.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No hay alineaciones guardadas todavía. Armá una en Formaciones.
        </p>
      ) : (
        <ul className="space-y-2">
          {lineups.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => onPick(l)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-celeste-300 hover:bg-celeste-50/50"
              >
                <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-celeste-50 font-display text-xs font-bold text-celeste-600">
                  {l.formacion === FREE_FORMATION ? 'LIBRE' : l.formacion}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {l.nombre}
                  </span>
                  <span className="block text-xs text-slate-400">{formatDate(l.fecha)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
