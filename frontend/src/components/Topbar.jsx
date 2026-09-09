import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRightOnRectangleIcon, Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext.jsx'

const TITLES = {
  '/': 'Dashboard',
  '/proyectos': 'Proyectos',
  '/personal': 'Personal',
  '/materiales': 'Materiales',
  '/herramientas': 'Herramientas',
  '/alertas': 'Alertas de inventario',
  '/proveedores': 'Proveedores y servicios',
  '/incidencias': 'Incidencias de obra',
  '/costos': 'Consolidación de costos',
  '/reportes': 'Reportes',
  '/auditoria': 'Trazabilidad y auditoría',
  '/usuarios': 'Gestión de usuarios',
}

// Roles reales del sistema (tabla `roles`, ver docs/seed_usuarios_prueba.sql)
const ROLE_LABELS = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  MAESTRO_OBRA: 'Maestro de obra',
  ENCARGADO_BODEGA: 'Encargado de bodega',
  TRABAJADOR: 'Trabajador',
}

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const title = TITLES[pathname] ?? 'SCOPI'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="flex items-center gap-4 px-4 py-3.5 sm:px-6 lg:px-10">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menú"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>

        <div className="ml-auto flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar proyecto, material, trabajador…"
              className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {/* User */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold text-slate-800">{user?.username ?? 'Usuario'}</p>
              <p className="text-[11px] text-slate-500">{ROLE_LABELS[user?.rol] ?? user?.rol ?? 'Usuario'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Cerrar sesión"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}