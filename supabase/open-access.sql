-- ============================================================================
--  C.A.O.S · Acceso abierto (SIN login)
--  Corré este archivo en el SQL Editor de Supabase DESPUÉS de schema.sql.
--
--  Cambia las políticas para que también el rol anónimo (usuarios sin cuenta)
--  pueda leer y escribir. Necesario porque la app ya no usa login.
--
--  ⚠️  Con esto, cualquiera que tenga la URL de la app publicada puede ver y
--      editar los datos. Para un plantel amateur suele estar bien; si más
--      adelante querés cerrarlo, volvés a poner "to authenticated" (o el login).
-- ============================================================================

-- Tablas
drop policy if exists "players_all" on public.players;
create policy "players_all" on public.players
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "lineups_all" on public.lineups;
create policy "lineups_all" on public.lineups
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "lineup_positions_all" on public.lineup_positions;
create policy "lineup_positions_all" on public.lineup_positions
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "matches_all" on public.matches;
create policy "matches_all" on public.matches
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "match_stats_all" on public.match_stats;
create policy "match_stats_all" on public.match_stats
  for all to anon, authenticated using (true) with check (true);

-- Storage: subir / editar / borrar fotos sin login
drop policy if exists "player_photos_insert" on storage.objects;
create policy "player_photos_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'player-photos');

drop policy if exists "player_photos_update" on storage.objects;
create policy "player_photos_update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'player-photos');

drop policy if exists "player_photos_delete" on storage.objects;
create policy "player_photos_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'player-photos');

-- Listo. Recargá la app y ya entra directo, sin pantalla de login.
