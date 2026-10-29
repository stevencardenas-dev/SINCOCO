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
const Solicitudes = lazy(() => import('./pages/Solicitudes.jsx'))
const EntradasInventario = lazy(() => import('./pages/EntradasInventario.jsx'))
const DevolucionesMateriales = lazy(() => import('./pages/DevolucionesMateriales.jsx'))
const ConsumosMateriales = lazy(() => import('./pages/ConsumosMateriales.jsx'))
const SalidasMateriales = lazy(() => import('./pages/SalidasMateriales.jsx'))
const Alertas = lazy(() => import('./pages/Alertas.jsx'))
const Materiales = lazy(() => import('./pages/Materiales.jsx'))
const Incidencias = lazy(() => import('./pages/Incidencias.jsx'))
const ProveedoresServicios = lazy(() => import('./pages/ProveedoresServicios.jsx'))

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
          {/* HU-07: catálogo de materiales; la matriz de permisos decide quién entra. */}
          <Route
            path="materiales"
            element={
              <RutaPorPermiso permisos={['materiales.listar']}>
                <Materiales />
              </RutaPorPermiso>
            }
          />
          <Route
            path="ingresos"
            element={
              <RutaPorPermiso permisos={['entradas_inventario.listar']}>
                <EntradasInventario />
              </RutaPorPermiso>
            }
          />
          {/* HU-09: devolución de materiales sobrantes. */}
          <Route
            path="devoluciones"
            element={
              <RutaPorPermiso permisos={['devoluciones_materiales.listar']}>
                <DevolucionesMateriales />
              </RutaPorPermiso>
            }
          />
          {/* HU-26: salida efectiva de materiales (constancia de lo despachado). */}
          <Route
            path="salidas"
            element={
              <RutaPorPermiso permisos={['salidas_materiales.listar']}>
                <SalidasMateriales />
              </RutaPorPermiso>
            }
          />
          {/* HU-20: consumo real de materiales por actividad. */}
          <Route
            path="consumos"
            element={
              <RutaPorPermiso permisos={['consumos_materiales.listar']}>
                <ConsumosMateriales />
              </RutaPorPermiso>
            }
          />
          <Route
            path="alertas"
            element={
              <RutaPorPermiso permisos={['alertas.listar']}>
                <Alertas />
              </RutaPorPermiso>
            }
          />
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
          {/* Solicitudes al inventario: pestañas Herramientas (HU-30) y Materiales (HU-08). */}
          <Route
            path="solicitudes"
            element={
              <RutaPorPermiso permisos={['solicitudes_herramientas.listar']}>
                <Solicitudes />
              </RutaPorPermiso>
            }
          />
                    {/* HU-13 y HU-28: proveedores y servicios externos en pestañas; la matriz de permisos decide quién entra. */}
          <Route
            path="proveedores"
            element={
              <RutaPorPermiso permisos={['proveedores.listar', 'servicios_externos.listar']}>
                <ProveedoresServicios />
              </RutaPorPermiso>
            }
          />
          {/* Incidencias de obra */}
          <Route
            path="incidencias"
            element={
              <RutaPorPermiso permisos={['incidencias.listar']}>
                <Incidencias />
              </RutaPorPermiso>
            }
          />
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