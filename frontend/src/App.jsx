import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'

// Carga diferida por ruta: recharts (dashboard) no pesa en el chunk inicial
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Proyectos = lazy(() => import('./pages/Proyectos.jsx'))
const ModulePlaceholder = lazy(() => import('./pages/ModulePlaceholder.jsx'))
const Usuarios = lazy(() => import('./pages/Usuarios.jsx'))
const RolesPermisos = lazy(() => import('./pages/RolesPermisos.jsx'))
const Catalogo = lazy(() => import('./pages/Catalogo.jsx'))
const Perfil = lazy(() => import('./pages/Perfil.jsx'))
const Auditoria = lazy(() => import('./pages/Auditoria.jsx'))
const Personal = lazy(() => import('./pages/Personal.jsx'))
const PlanProyecto = lazy(() => import('./pages/PlanProyecto.jsx'))
const Herramientas = lazy(() => import('./pages/Herramientas.jsx'))

/**
 * RNF05 · RBAC en las rutas: ocultar la opción del menú no basta, alguien
 * puede escribir la URL. Un rol sin permiso vuelve al dashboard.
 */
function RutaPorRol({ roles, children }) {
  const { user } = useAuth()
  return roles.includes(user?.rol) ? children : <Navigate to="/" replace />
}

/**
 * Igual que RutaPorRol, pero para módulos que la matriz de Roles y permisos
 * decide: la ruta se abre con al menos uno de los permisos indicados.
 */
function RutaPorPermiso({ permisos, children }) {
  const { puede, cargandoPermisos } = useAuth()
  // Sin la respuesta de permisos todavía no se decide: si se redirige antes,
  // recargar la página en /catalogo llevaría al dashboard sin motivo.
  if (cargandoPermisos) return <Spinner />
  return puede(...permisos) ? children : <Navigate to="/" replace />
}

const ADMIN = 'ADMINISTRADOR'
const GERENTE = 'GERENTE'
const MAESTRO = 'MAESTRO_OBRA'
const BODEGA = 'ENCARGADO_BODEGA'

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-accent-500" />
  </div>
)

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner />

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          {/* HU-01 · HU-04: información personal de cualquier usuario autenticado */}
          <Route path="perfil" element={<Perfil />} />
          <Route
            path="proyectos"
            element={
              <RutaPorRol roles={[ADMIN, GERENTE, MAESTRO]}>
                <Proyectos />
              </RutaPorRol>
            }
          />
          {/* RF03–RF04 · HU-03 */}
          <Route
            path="proyectos/:id"
            element={
              <RutaPorRol roles={[ADMIN, GERENTE, MAESTRO]}>
                <PlanProyecto />
              </RutaPorRol>
            }
          />
          {/* RF06–RF07 · HU-04 */}
          <Route path="personal" element={<RutaPorRol roles={[ADMIN, GERENTE]}><Personal /></RutaPorRol>} />
          {/* Inventario de materiales */}
          <Route path="materiales" element={<RutaPorRol roles={[ADMIN, BODEGA, MAESTRO]}><ModulePlaceholder title="Materiales" descripcion="Catálogo de materiales con existencias y nivel mínimo, y el registro de entradas, salidas y consumos de inventario." /></RutaPorRol>} />
          {/* Inventario de herramientas */}
          {/* HU-10: catálogo de herramientas; la matriz de permisos decide quién entra. */}
          <Route
            path="herramientas"
            element={
              <RutaPorPermiso permisos={['herramientas.listar']}>
                <Herramientas />
              </RutaPorPermiso>
            }
          />
          {/* Proveedores y servicios */}
          <Route path="proveedores" element={<RutaPorRol roles={[ADMIN, GERENTE]}><ModulePlaceholder title="Proveedores y servicios" descripcion="Proveedores y servicios contratados: transporte, alquiler de maquinaria, electricidad y plomería, con responsable, proyecto, fechas y valor." /></RutaPorRol>} />
          {/* Incidencias de obra */}
          <Route path="incidencias" element={<RutaPorRol roles={[ADMIN, GERENTE, MAESTRO]}><ModulePlaceholder title="Incidencias de obra" descripcion="Novedades e imprevistos en obra (averías, accidentes, retrasos) vinculados al proyecto donde ocurrieron." /></RutaPorRol>} />
          {/* Alertas de inventario */}
          <Route path="alertas" element={<RutaPorRol roles={[ADMIN, GERENTE, BODEGA]}><ModulePlaceholder title="Alertas de inventario" descripcion="Avisos cuando un material alcanza el nivel mínimo definido en el catálogo, con su atención y seguimiento." /></RutaPorRol>} />
          {/* Consolidación de costos */}
          <Route path="costos" element={<RutaPorRol roles={[ADMIN, GERENTE]}><ModulePlaceholder title="Consolidación de costos" descripcion="Consolidación de costos de materiales y servicios externos por proyecto para el análisis gerencial." /></RutaPorRol>} />
          {/* Reportes */}
          <Route path="reportes" element={<RutaPorRol roles={[ADMIN, GERENTE]}><ModulePlaceholder title="Reportes" descripcion="Reportes filtrados por proyecto, periodo o trabajador, exportables a PDF y Excel." /></RutaPorRol>} />
          {/* RF18 · HU-17: bitácora de trazabilidad (solo el administrador) */}
          <Route path="auditoria" element={<RutaPorRol roles={[ADMIN]}><Auditoria /></RutaPorRol>} />
          {/* RF1 */}
          <Route path="usuarios" element={<RutaPorRol roles={[ADMIN]}><Usuarios /></RutaPorRol>} />
          {/* RF1 · monitoreo de la matriz roles_permisos (solo el administrador) */}
          <Route path="roles" element={<RutaPorRol roles={[ADMIN]}><RolesPermisos /></RutaPorRol>} />
          {/* RF01 · RF06: cargos, especialidades y clientes. La matriz de Roles y
              permisos decide quién ve el módulo (`catalogos.listar`), igual que el menú. */}
          <Route
            path="catalogo"
            element={
              <RutaPorPermiso permisos={['catalogos.listar', 'catalogos.gestionar']}>
                <Catalogo />
              </RutaPorPermiso>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}