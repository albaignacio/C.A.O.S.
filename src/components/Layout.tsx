import { NavLink, Outlet } from 'react-router-dom';
import { Home, Users, LayoutGrid, PenTool, BarChart3 } from 'lucide-react';
import { Toaster } from './Toast';

const NAV = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/plantel', label: 'Plantel', icon: Users },
  { to: '/formaciones', label: 'Formaciones', icon: LayoutGrid },
  { to: '/pizarra', label: 'Pizarra', icon: PenTool },
  { to: '/estadisticas', label: 'Stats', icon: BarChart3 },
];

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Header blanco con blur — identidad C.A.O.S */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Escudo C.A.O.S"
              className="h-10 w-10 object-contain drop-shadow-sm"
            />
            <div className="leading-tight">
              <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
                C.A.O.S
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-celeste-600">
                Gestión del equipo
              </p>
            </div>
          </div>

          {/* Navegación en desktop */}
          <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100/80 p-1 sm:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-celeste-400 ${
                    isActive
                      ? 'bg-white text-celeste-700 shadow-card'
                      : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-6 sm:pb-10">
        <Outlet />
      </main>

      {/* Navegación inferior flotante (celular) */}
      <nav
        className="fixed inset-x-4 z-30 rounded-2xl border border-slate-200/70 bg-white/90 shadow-lift backdrop-blur-md sm:hidden"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition-all duration-200 ${
                  isActive ? 'bg-celeste-50 text-celeste-700' : 'text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Toaster />
    </div>
  );
}
