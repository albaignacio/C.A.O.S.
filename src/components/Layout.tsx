import { NavLink, Outlet } from 'react-router-dom';
import { Users, LayoutGrid, BarChart3 } from 'lucide-react';

const NAV = [
  { to: '/plantel', label: 'Plantel', icon: Users },
  { to: '/formaciones', label: 'Formaciones', icon: LayoutGrid },
  { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
];

export function Layout() {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-celeste-500 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Escudo C.A.O.S"
              className="h-10 w-10 object-contain drop-shadow"
            />
            <div className="leading-tight">
              <h1 className="text-xl font-extrabold tracking-wide">C.A.O.S</h1>
              <p className="text-[11px] font-medium text-celeste-100">Gestión del equipo</p>
            </div>
          </div>

          {/* Navegación en desktop */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-white text-celeste-600' : 'text-white/90 hover:bg-white/10'
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:pb-8">
        <Outlet />
      </main>

      {/* Navegación inferior (celular) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-celeste-600' : 'text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
