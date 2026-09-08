import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'

// Carga diferida por ruta: recharts (dashboard) no pesa en el chunk inicial
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Proyectos = lazy(() => import('./pages/Proyectos.jsx'))
const ModulePlaceholder = lazy(() => import('./pages/ModulePlaceholder.jsx'))

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
          <Route path="proyectos" element={<Proyectos />} />
          {/* RF5–RF6 */}
          <Route path="personal" element={<ModulePlaceholder title="Personal" rf="RF06 · RF07" />} />
          {/* RF7–RF9 */}
          <Route path="materiales" element={<ModulePlaceholder title="Materiales" rf="RF09 · RF10 · RF11" />} />
          {/* RF10–RF11 */}
          <Route path="herramientas" element={<ModulePlaceholder title="Herramientas" rf="RF15 · RF16 · RF17" />} />
          {/* RF12 */}
          <Route path="proveedores" element={<ModulePlaceholder title="Proveedores y servicios" rf="RF19 · RF20" />} />
          {/* RF13 */}
          <Route path="incidencias" element={<ModulePlaceholder title="Incidencias de obra" rf="RF22" />} />
          {/* RF14 */}
          <Route path="alertas" element={<ModulePlaceholder title="Alertas de inventario" rf="RF23" />} />
          {/* RF15 */}
          <Route path="costos" element={<ModulePlaceholder title="Consolidación de costos" rf="RF26" />} />
          {/* RF17 */}
          <Route path="reportes" element={<ModulePlaceholder title="Reportes" rf="RF29 · RF30" />} />
          {/* RF18 */}
          <Route path="auditoria" element={<ModulePlaceholder title="Trazabilidad y auditoría" rf="RF31 · RF32" />} />
          {/* RF1 */}
          <Route path="usuarios" element={<ModulePlaceholder title="Gestión de usuarios" rf="RF01" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}