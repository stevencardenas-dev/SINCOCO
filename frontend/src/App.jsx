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
const Auditoria = lazy(() => import('./pages/Auditoria.jsx'))
const Personal = lazy(() => import('./pages/Personal.jsx'))
const PlanProyecto = lazy(() => import('./pages/PlanProyecto.jsx'))

/**
 * RNF05 · RBAC en las rutas: ocultar la opción del menú no basta, alguien
 * puede escribir la URL. Un rol sin permiso vuelve al dashboard.
 */
function RutaPorRol({ roles, children }) {
  const { user } = useAuth()
  return roles.includes(user?.rol) ? children : <Navigate to="/" replace />
}

const ADMIN = 'ADMINISTRADOR'
const GERENTE = 'GERENTE'
const MAESTRO = 'MAESTRO_OBRA'
const BODEGA = 'ENCARGADO_BODEGA'

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
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
          {/* RF7–RF9 */}
          <Route path="materiales" element={<RutaPorRol roles={[ADMIN, BODEGA, MAESTRO]}><ModulePlaceholder title="Materiales" rf="RF09 · RF10 · RF11" /></RutaPorRol>} />
          {/* RF10–RF11 */}
          <Route path="herramientas" element={<RutaPorRol roles={[ADMIN, BODEGA]}><ModulePlaceholder title="Herramientas" rf="RF15 · RF16 · RF17" /></RutaPorRol>} />
          {/* RF12 */}
          <Route path="proveedores" element={<RutaPorRol roles={[ADMIN, GERENTE]}><ModulePlaceholder title="Proveedores y servicios" rf="RF19 · RF20" /></RutaPorRol>} />
          {/* RF13 */}
          <Route path="incidencias" element={<RutaPorRol roles={[ADMIN, GERENTE, MAESTRO]}><ModulePlaceholder title="Incidencias de obra" rf="RF22" /></RutaPorRol>} />
          {/* RF14 */}
          <Route path="alertas" element={<RutaPorRol roles={[ADMIN, GERENTE, BODEGA]}><ModulePlaceholder title="Alertas de inventario" rf="RF23" /></RutaPorRol>} />
          {/* RF15 */}
          <Route path="costos" element={<RutaPorRol roles={[ADMIN, GERENTE]}><ModulePlaceholder title="Consolidación de costos" rf="RF26" /></RutaPorRol>} />
          {/* RF17 */}
          <Route path="reportes" element={<RutaPorRol roles={[ADMIN, GERENTE]}><ModulePlaceholder title="Reportes" rf="RF29 · RF30" /></RutaPorRol>} />
          {/* RF18 · HU-17: bitácora de trazabilidad (solo el administrador) */}
          <Route path="auditoria" element={<RutaPorRol roles={[ADMIN]}><Auditoria /></RutaPorRol>} />
          {/* RF1 */}
          <Route path="usuarios" element={<RutaPorRol roles={[ADMIN]}><Usuarios /></RutaPorRol>} />
          {/* RF1 · monitoreo de la matriz roles_permisos (solo el administrador) */}
          <Route path="roles" element={<RutaPorRol roles={[ADMIN]}><RolesPermisos /></RutaPorRol>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}