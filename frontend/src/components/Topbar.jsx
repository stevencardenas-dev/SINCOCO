import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  '/roles': 'Roles y permisos',
  '/catalogo': 'Gestión Administrativa',
  '/perfil': 'Mi información personal',
}

// Roles reales del sistema (tabla `roles`, ver docs/seed_usuarios_prueba.sql)
const ROLE_LABELS = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  MAESTRO_OBRA: 'Maestro de obra',
  ENCARGADO_BODEGA: 'Encargado de bodega',
}

// El buscador de la barra superior busca proyectos: es el listado que el
// módulo ofrece con filtro en la base. Los roles que no entran a Proyectos no
// lo ven, para no ofrecer una búsqueda que no lleva a ninguna parte.
const ROLES_CON_PROYECTOS = ['ADMINISTRADOR', 'GERENTE', 'MAESTRO_OBRA']

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')

  const title = TITLES[pathname] ?? 'SINCOCO'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const buscar = (e) => {
    e.preventDefault()
    const texto = busqueda.trim()
    if (!texto) return
    setBusqueda('')
    navigate(`/proyectos?buscar=${encodeURIComponent(texto)}`)
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
          {/* Search: filtra el listado de proyectos (corre en la base). En
              Personal no se muestra: esa pantalla tiene su propio buscador y
              uno de proyectos ahí confunde. */}
          {ROLES_CON_PROYECTOS.includes(user?.rol) && pathname !== '/personal' && (
            <form onSubmit={buscar} className="relative hidden md:block">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar proyecto…"
                aria-label="Buscar proyecto"
                className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-accent-400 focus:bg-white focus:ring-2 focus:ring-accent-400/40"
              />
            </form>
          )}

          {/* User: el bloque abre la información personal (HU-01 · HU-04). */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-3">
            <Link
              to="/perfil"
              className="flex items-center gap-3 rounded-lg transition hover:bg-accent-50"
              title="Ver mi información personal"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-xs font-bold text-white">
                {user?.username?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-slate-800">{user?.username ?? 'Usuario'}</p>
                <p className="text-[11px] text-slate-500">{ROLE_LABELS[user?.rol] ?? user?.rol ?? 'Usuario'}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="ml-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-accent-50 hover:text-brand-900"
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