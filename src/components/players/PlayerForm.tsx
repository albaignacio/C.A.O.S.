import { useRef, useState, type FormEvent } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { supabase, PHOTO_BUCKET } from '../../lib/supabase';
import type { Player, PlayerInput, Position } from '../../types';
import { POSITIONS, POSITION_LABELS } from '../../lib/helpers';
import { Avatar } from '../Avatar';
import { Spinner } from '../Spinner';
import { InlineError } from '../ErrorState';

interface Props {
  /** Si viene, es edición; si no, es alta. */
  player?: Player | null;
  onSaved: () => void;
  onCancel: () => void;
  onDelete?: (player: Player) => void;
}

export function PlayerForm({ player, onSaved, onCancel, onDelete }: Props) {
  const [nombre, setNombre] = useState(player?.nombre ?? '');
  const [apodo, setApodo] = useState(player?.apodo ?? '');
  const [numero, setNumero] = useState<string>(player?.numero != null ? String(player.numero) : '');
  const [posicion, setPosicion] = useState<Position>(player?.posicion ?? 'mediocampista');
  const [fotoUrl, setFotoUrl] = useState<string | null>(player?.foto_url ?? null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('El archivo tiene que ser una imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      setFotoUrl(data.publicUrl);
    } catch (err) {
      setError('No se pudo subir la foto. ¿Creaste el bucket "player-photos"?');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    const payload: PlayerInput = {
      nombre: nombre.trim(),
      apodo: apodo.trim() || null,
      numero: numero.trim() ? Number(numero) : null,
      posicion,
      foto_url: fotoUrl,
    };

    setSaving(true);
    try {
      if (player) {
        const { error: err } = await supabase.from('players').update(payload).eq('id', player.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('players').insert(payload);
        if (err) throw err;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el jugador.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="player-form" onSubmit={onSubmit} className="space-y-4">
      {/* Foto */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar nombre={nombre || '?'} apodo={apodo} fotoUrl={fotoUrl} size={88} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-celeste-500 text-white shadow-md hover:bg-celeste-600"
            aria-label="Subir foto"
          >
            {uploading ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          </button>
        </div>
        {fotoUrl && (
          <button
            type="button"
            onClick={() => setFotoUrl(null)}
            className="text-xs font-medium text-slate-400 hover:text-red-500"
          >
            Quitar foto
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div>
        <label className="label" htmlFor="nombre">
          Nombre *
        </label>
        <input
          id="nombre"
          className="input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre y apellido"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="apodo">
            Apodo
          </label>
          <input
            id="apodo"
            className="input"
            value={apodo}
            onChange={(e) => setApodo(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="label" htmlFor="numero">
            N° camiseta
          </label>
          <input
            id="numero"
            type="number"
            min={0}
            max={999}
            className="input"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="10"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="posicion">
          Posición preferida
        </label>
        <select
          id="posicion"
          className="input"
          value={posicion}
          onChange={(e) => setPosicion(e.target.value as Position)}
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {error && <InlineError message={error} />}

      <div className="flex items-center gap-2 pt-1">
        {player && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(player)}
            className="btn-ghost text-red-500 hover:bg-red-50"
            title="Eliminar jugador"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  );
}
