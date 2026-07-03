import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Player } from '../types';

/** Trae el plantel ordenado por número (los sin número, al final). */
export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('players')
      .select('*')
      .order('numero', { ascending: true, nullsFirst: false })
      .order('nombre', { ascending: true });

    if (err) {
      setError('No se pudo cargar el plantel.');
      console.error(err);
    } else {
      setPlayers((data ?? []) as Player[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { players, loading, error, reload: load };
}
