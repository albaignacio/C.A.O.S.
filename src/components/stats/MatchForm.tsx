import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Match } from '../../types';
import { todayISO } from '../../lib/helpers';
import { Modal } from '../Modal';
import { Spinner } from '../Spinner';
import { InlineError } from '../ErrorState';

interface Props {
  open: boolean;
  match?: Match | null;
  onClose: () => void;
  onSaved: (matchId: string) => void;
}

/** Alta / edición de los datos de un partido (rival, fecha, resultado). */
export function MatchForm({ open, match, onClose, onSaved }: Props) {
  const [rival, setRival] = useState(match?.rival ?? '');
  const [fecha, setFecha] = useState(match?.fecha ?? todayISO());
  const [golesFavor, setGolesFavor] = useState(String(match?.goles_favor ?? 0));
  const [golesContra, setGolesContra] = useState(String(match?.goles_contra ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!rival.trim()) {
      setError('Ingresá el rival.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      rival: rival.trim(),
      fecha,
      goles_favor: Number(golesFavor) || 0,
      goles_contra: Number(golesContra) || 0,
    };
    try {
      if (match) {
        const { error: err } = await supabase.from('matches').update(payload).eq('id', match.id);
        if (err) throw err;
        onSaved(match.id);
      } else {
        const { data, error: err } = await supabase
          .from('matches')
          .insert(payload)
          .select('id')
          .single();
        if (err) throw err;
        onSaved(data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el partido.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={match ? 'Editar partido' : 'Nuevo partido'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Guardar'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="rival">
            Rival
          </label>
          <input
            id="rival"
            className="input"
            placeholder="Nombre del equipo rival"
            value={rival}
            onChange={(e) => setRival(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="fecha">
            Fecha
          </label>
          <input
            id="fecha"
            type="date"
            className="input"
            value={fecha ?? ''}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="gf">
              Goles a favor
            </label>
            <input
              id="gf"
              type="number"
              min={0}
              className="input text-center text-lg font-bold"
              value={golesFavor}
              onChange={(e) => setGolesFavor(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="gc">
              Goles en contra
            </label>
            <input
              id="gc"
              type="number"
              min={0}
              className="input text-center text-lg font-bold"
              value={golesContra}
              onChange={(e) => setGolesContra(e.target.value)}
            />
          </div>
        </div>
        {error && <InlineError message={error} />}
      </div>
    </Modal>
  );
}
