import { useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  BellAlertIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  HomeIcon,
  KeyIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  TruckIcon,
  UserCircleIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'

const ADMIN = 'ADMINISTRADOR'
const GERENTE = 'GERENTE'
const MAESTRO = 'MAESTRO_OBRA'
const BODEGA = 'ENCARGADO_BODEGA'
const TODOS = [ADMIN, GERENTE, MAESTRO, BODEGA]

/**
 * RNF05 · RBAC: cada opción declara qué roles la ven. Los roles salen del JWT
 * y corresponden a los casos de uso de cada actor (ver docs/reglas-de-negocio/CASOS_DE_USO.md).
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
      { to: '/usuarios', label: 'Usuarios', icon: UserCircleIcon, roles: [ADMIN] },
    ],
  },
  {
    group: 'Inventario',
    items: [
      { to: '/materiales', label: 'Materiales', icon: CubeIcon, permiso: ['materiales.listar'] },
      { to: '/herramientas', label: 'Herramientas', icon: WrenchScrewdriverIcon, permiso: ['herramientas.listar'] },
      { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardDocumentListIcon, permiso: ['solicitudes_herramientas.listar'] },
      { to: '/movimientos', label: 'Movimientos', icon: ArrowsRightLeftIcon, permiso: ['entradas_inventario.listar', 'salidas_materiales.listar', 'devoluciones_materiales.listar', 'traslados_materiales.listar'] },
      { to: '/alertas', label: 'Alertas', icon: BellAlertIcon, permiso: ['alertas.listar'] },
    ],
  },
  {
    group: 'Gestión',
    items: [
      { to: '/proveedores', label: 'Proveedores', icon: TruckIcon, permiso: ['proveedores.listar', 'servicios_externos.listar'] },
      { to: '/incidencias', label: 'Incidencias', icon: ExclamationTriangleIcon, permiso: ['incidencias.listar'] },
      { to: '/costos', label: 'Costos', icon: CurrencyDollarIcon, roles: [ADMIN, GERENTE], proximamente: true },
    ],
  },
  {
    group: 'Sistema',
    items: [
      // RF01 · RF06: valores de dominio (cargos, especialidades y clientes).
      // A diferencia del resto, esta opción se muestra según la matriz de Roles
      // y permisos (`catalogos.listar` / `catalogos.gestionar`): así el menú y
      // esa pantalla no se contradicen si el administrador cambia la matriz.
      { to: '/catalogo', label: 'Gestión Administrativa', icon: RectangleStackIcon, permiso: ['catalogos.listar', 'catalogos.gestionar'] },
      { to: '/reportes', label: 'Reportes', icon: DocumentChartBarIcon, roles: [ADMIN, GERENTE], proximamente: true },
      { to: '/auditoria', label: 'Auditoría', icon: ShieldCheckIcon, roles: [ADMIN] },
      { to: '/roles', label: 'Roles y permisos', icon: KeyIcon, roles: [ADMIN] },
    ],
  },
]

const PERFIL = { to: '/perfil', label: 'Mi información', icon: UserCircleIcon }

export default function Sidebar({ open, onClose, collapsed = false, onToggle }) {
  const { user, puede } = useAuth()
  const { pathname } = useLocation()
  const asideRef = useRef(null)
  const rol = user?.rol

  // Solo los grupos que conservan al menos una opción visible. Las opciones con
  // `permiso` las decide la matriz Roles y permisos; las demás, el rol.
  const nav = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => (i.permiso ? puede(...i.permiso) : i.roles.includes(rol))),
  })).filter((g) => g.items.length > 0)

  // Roving tabindex: solo la opción activa entra en el orden de Tab, así que
  // un Tab desde el sidebar salta al contenido; entre opciones se navega con flechas.
  const todas = [...nav.flatMap((g) => g.items), PERFIL]
  const activa =
    todas
      .filter((i) => (i.to === '/' ? pathname === '/' : pathname === i.to || pathname.startsWith(i.to + '/')))
      .sort((a, b) => b.to.length - a.to.length)[0] ?? todas[0]

  const onKeyDown = (e) => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const links = [...asideRef.current.querySelectorAll('a[data-nav]')]
    const i = links.indexOf(document.activeElement)
    if (i === -1) return
    e.preventDefault()
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? links.length - 1
        : e.key === 'ArrowDown' ? (i + 1) % links.length : (i - 1 + links.length) % links.length
    links[next].focus()
  }

  const linkProps = (i) => ({
    'data-nav': true,
    tabIndex: i.to === activa.to ? 0 : -1,
    onClick: onClose,
    title: collapsed ? i.label : i.proximamente ? 'Próximamente' : undefined,
  })
  const label = collapsed ? 'lg:sr-only' : ''

  return (
    <aside
      ref={asideRef}
      onKeyDown={onKeyDown}
      className={`fixed inset-y-0 left-0 z-40 flex w-64 ${collapsed ? 'lg:w-16' : ''} flex-col bg-brand-900 transition-transform duration-200 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center justify-between px-6 py-5 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
        <NavLink to="/" onClick={onClose} tabIndex={-1} title={collapsed ? 'SINCOCO' : undefined} className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <div className={collapsed ? 'lg:hidden' : ''}>
            <p className="text-base font-bold leading-tight tracking-tight text-white">SINCOCO</p>
            <p className="text-[11px] font-medium text-slate-400">Control de proyectos</p>
          </div>
        </NavLink>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-800 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Filo amarillo de marca bajo el encabezado */}
      <div className={`h-px bg-gradient-to-r from-accent-400 via-accent-400/40 to-transparent ${collapsed ? 'mx-6 lg:mx-3' : 'mx-6'}`} />

      {/* Nav */}
      <nav className={`sidebar-scroll flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-6 ${collapsed ? 'lg:px-2' : ''}`}>
        {nav.map((group) => (
          <div key={group.group}>
            <p className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${collapsed ? 'lg:sr-only' : ''}`}>
              {group.group}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const { to, label: texto, icon: Icon, end, proximamente } = item
                return (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    {...linkProps(item)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
                        isActive
                          ? 'bg-accent-400 font-semibold text-brand-950 shadow-sm'
                          : proximamente
                            ? 'font-medium text-slate-500 hover:bg-brand-800/60 hover:text-slate-300'
                            : 'font-medium text-slate-300 hover:bg-brand-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className={label}>{texto}</span>
                  </NavLink>
                </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: la información personal está disponible para todos los roles. */}
      <div className={`border-t border-brand-800 px-4 py-3 ${collapsed ? 'lg:px-2' : ''}`}>
        <NavLink
          to="/perfil"
          {...linkProps(PERFIL)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
              isActive
                ? 'bg-accent-400 font-semibold text-brand-950 shadow-sm'
                : 'font-medium text-slate-300 hover:bg-brand-800 hover:text-white'
            }`
          }
        >
          <UserCircleIcon className="h-5 w-5 shrink-0" />
          <span className={label}>Mi información</span>
        </NavLink>
      </div>

      {/* Retraer / expandir (Ctrl + B). Solo escritorio. */}
      <div className="hidden border-t border-brand-800 px-4 py-3 lg:block">
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-keyshortcuts="Control+B"
          aria-label={collapsed ? 'Expandir menú' : 'Retraer menú'}
          title={collapsed ? 'Expandir menú (Ctrl+B)' : 'Retraer menú (Ctrl+B)'}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-brand-800 hover:text-white ${collapsed ? 'justify-center px-0' : ''}`}
        >
          {collapsed ? (
            <ChevronDoubleRightIcon className="h-5 w-5" />
          ) : (
            <>
              <ChevronDoubleLeftIcon className="h-5 w-5" /> Retraer
              <kbd className="ml-auto rounded bg-brand-800 px-1.5 py-0.5 text-[10px]">Ctrl B</kbd>
            </>
          )}
        </button>
      </div>

      <div className={`border-t border-brand-800 px-6 py-4 ${collapsed ? 'lg:hidden' : ''}`}>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Constructora XYZ · Cúcuta
          <br />
          Control integral de proyectos de construcción
        </p>
      </div>
    </aside>
  )
}