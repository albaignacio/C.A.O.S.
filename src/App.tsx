import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PlayersPage } from './pages/PlayersPage';
import { LineupsPage } from './pages/LineupsPage';
import { StatsPage } from './pages/StatsPage';

// App abierta (sin login): la data del club es compartida y cualquiera con
// acceso a la app puede ver y editar el plantel, formaciones y estadísticas.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/plantel" element={<PlayersPage />} />
          <Route path="/formaciones" element={<LineupsPage />} />
          <Route path="/estadisticas" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/plantel" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
