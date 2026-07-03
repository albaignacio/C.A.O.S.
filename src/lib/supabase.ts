import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Mensaje claro en consola si faltan las variables de entorno.
  throw new Error(
    'Faltan las variables de entorno de Supabase. Copiá ".env.example" a ".env" ' +
      'y completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/** Nombre del bucket de Storage donde se guardan las fotos de los jugadores. */
export const PHOTO_BUCKET = 'player-photos';
