import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { PlayersPage } from './pages/PlayersPage';
import { LineupsPage } from './pages/LineupsPage';
import { BoardPage } from './pages/BoardPage';
import { StatsPage } from './pages/StatsPage';

// App abierta (sin login): la data del club es compartida y cualquiera con
// acceso a la app puede ver y editar el plantel, formaciones y estadísticas.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/plantel" element={<PlayersPage />} />
          <Route path="/formaciones" element={<LineupsPage />} />
          <Route path="/pizarra" element={<BoardPage />} />
          <Route path="/estadisticas" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
