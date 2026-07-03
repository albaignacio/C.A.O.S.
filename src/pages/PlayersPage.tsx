import { useMemo, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { supabase, PHOTO_BUCKET } from '../lib/supabase';
import type { Player } from '../types';
import { usePlayers } from '../hooks/usePlayers';
import { Avatar } from '../components/Avatar';
import { PositionBadge } from '../components/PositionBadge';
import { Modal } from '../components/Modal';
import { PlayerGridSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PlayerForm } from '../components/players/PlayerForm';
import { toast } from '../components/Toast';

export function PlayersPage() {
  const { players, loading, error, reload } = usePlayers();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.apodo ?? '').toLowerCase().includes(q) ||
        String(p.numero ?? '').includes(q),
    );
  }, [players, query]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: Player) {
    setEditing(p);
    setFormOpen(true);
  }

  function handleSaved() {
    setFormOpen(false);
    setEditing(null);
    toast('Jugador guardado');
    void reload();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      // Intentar borrar la foto del storage (si estaba en nuestro bucket).
      if (deleting.foto_url?.includes(`/${PHOTO_BUCKET}/`)) {
        const path = deleting.foto_url.split(`/${PHOTO_BUCKET}/`)[1];
        if (path) await supabase.storage.from(PHOTO_BUCKET).remove([path]);
      }
      const { error: err } = await supabase.from('players').delete().eq('id', deleting.id);
      if (err) throw err;
      setDeleting(null);
      setFormOpen(false);
      toast('Jugador eliminado');
      void reload();
    } catch (err) {
      console.error(err);
      toast('No se pudo eliminar el jugador.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Plantel</h2>
          <p className="tnum text-sm text-slate-400">
            {players.length} {players.length === 1 ? 'jugador' : 'jugadores'}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo jugador</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, apodo o número…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <PlayerGridSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : players.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="Todavía no hay jugadores"
          description="Agregá el primer jugador del plantel para empezar."
          action={
            <button onClick={openNew} className="btn-primary">
              <Plus className="h-4 w-4" /> Agregar jugador
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No se encontraron jugadores para “{query}”.
        </p>
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => openEdit(p)}
              className="card card-hover group flex flex-col items-center gap-2 p-4 text-center"
            >
              <div className="relative">
                <Avatar nombre={p.nombre} apodo={p.apodo} fotoUrl={p.foto_url} size={64} />
                {p.numero != null && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-celeste-500 text-xs font-bold text-white ring-2 ring-white">
                    {p.numero}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {p.apodo || p.nombre}
                </p>
                {p.apodo && <p className="truncate text-xs text-slate-400">{p.nombre}</p>}
              </div>
              <PositionBadge position={p.posicion} />
            </button>
          ))}
        </div>
      )}

      {/* Modal alta / edición */}
      <Modal
        open={formOpen}
        title={editing ? 'Editar jugador' : 'Nuevo jugador'}
        onClose={() => setFormOpen(false)}
      >
        <PlayerForm
          player={editing}
          onSaved={handleSaved}
          onCancel={() => setFormOpen(false)}
          onDelete={(p) => setDeleting(p)}
        />
      </Modal>

      {/* Confirmación de borrado */}
      <Modal
        open={!!deleting}
        title="Eliminar jugador"
        onClose={() => setDeleting(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={confirmDelete} disabled={deleteBusy} className="btn-danger">
              {deleteBusy ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Seguro que querés eliminar a{' '}
          <span className="font-semibold">{deleting?.apodo || deleting?.nombre}</span>? También se
          borrarán sus estadísticas. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
