import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  BellAlertIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  HomeIcon,
  ShieldCheckIcon,
  TruckIcon,
  UserCircleIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const ADMIN = 'ADMINISTRADOR'
const GERENTE = 'GERENTE'
const MAESTRO = 'MAESTRO_OBRA'
const BODEGA = 'ENCARGADO_BODEGA'
const TRABAJADOR = 'TRABAJADOR'
const TODOS = [ADMIN, GERENTE, MAESTRO, BODEGA, TRABAJADOR]

/**
 * RNF05 · RBAC: cada opción declara qué roles la ven. Los roles salen del JWT
 * y corresponden a los casos de uso de cada actor (ver docs/CASOS_DE_USO.md).
 * Esto es control de acceso en la interfaz; el backend valida aparte con
 * requireRole() — la interfaz oculta, el servidor decide.
 */
const NAV = [
  {
    group: 'Operación',
    items: [
      { to: '/', label: 'Dashboard', icon: HomeIcon, end: true, roles: TODOS },
      { to: '/proyectos', label: 'Proyectos', icon: FolderIcon, roles: [ADMIN, GERENTE, MAESTRO] },
      { to: '/personal', label: 'Personal', icon: UsersIcon, roles: [ADMIN, GERENTE] },
    ],
  },
  {
    group: 'Inventario',
    items: [
      { to: '/materiales', label: 'Materiales', icon: CubeIcon, roles: [ADMIN, BODEGA, MAESTRO] },
      { to: '/herramientas', label: 'Herramientas', icon: WrenchScrewdriverIcon, roles: [ADMIN, BODEGA] },
      { to: '/alertas', label: 'Alertas', icon: BellAlertIcon, roles: [ADMIN, GERENTE, BODEGA] },
    ],
  },
  {
    group: 'Gestión',
    items: [
      { to: '/proveedores', label: 'Proveedores', icon: TruckIcon, roles: [ADMIN, GERENTE] },
      { to: '/incidencias', label: 'Incidencias', icon: ExclamationTriangleIcon, roles: [ADMIN, GERENTE, MAESTRO] },
      { to: '/costos', label: 'Costos', icon: CurrencyDollarIcon, roles: [ADMIN, GERENTE] },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { to: '/reportes', label: 'Reportes', icon: DocumentChartBarIcon, roles: [ADMIN, GERENTE] },
      { to: '/auditoria', label: 'Auditoría', icon: ShieldCheckIcon, roles: [ADMIN] },
      { to: '/usuarios', label: 'Usuarios', icon: UserCircleIcon, roles: [ADMIN] },
    ],
  },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const rol = user?.rol

  // Solo los grupos que conservan al menos una opción visible para el rol
  const nav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(rol)) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 transition-transform duration-200 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center justify-between px-6 py-5">
        <NavLink to="/" onClick={onClose} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-extrabold text-white shadow-lg shadow-brand-600/30">
            S
          </div>
          <div>
            <p className="text-base font-bold leading-tight tracking-tight text-white">SCOPI</p>
            <p className="text-[11px] font-medium text-slate-400">Control de proyectos</p>
          </div>
        </NavLink>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-scroll flex-1 space-y-6 overflow-y-auto px-4 pb-6">
        {nav.map((group) => (
          <div key={group.group}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.group}
            </p>
            <ul className="space-y-1">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-6 py-4">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Constructora XYZ · Cúcuta
          <br />
          Control integral de proyectos de construcción
        </p>
      </div>
    </aside>
  )
}