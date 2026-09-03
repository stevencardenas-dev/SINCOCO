import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Proyectos from './pages/Proyectos.jsx'
import ModulePlaceholder from './pages/ModulePlaceholder.jsx'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="proyectos" element={<Proyectos />} />
        {/* RF5–RF6 */}
        <Route path="personal" element={<ModulePlaceholder title="Personal" rf="RF5 · RF6" />} />
        {/* RF7–RF9 */}
        <Route path="materiales" element={<ModulePlaceholder title="Materiales" rf="RF7 · RF8 · RF9" />} />
        {/* RF10–RF11 */}
        <Route path="herramientas" element={<ModulePlaceholder title="Herramientas" rf="RF10 · RF11" />} />
        {/* RF12 */}
        <Route path="proveedores" element={<ModulePlaceholder title="Proveedores y servicios" rf="RF12" />} />
        {/* RF13 */}
        <Route path="incidencias" element={<ModulePlaceholder title="Incidencias de obra" rf="RF13" />} />
        {/* RF14 */}
        <Route path="alertas" element={<ModulePlaceholder title="Alertas de inventario" rf="RF14" />} />
        {/* RF15 */}
        <Route path="costos" element={<ModulePlaceholder title="Consolidación de costos" rf="RF15" />} />
        {/* RF17 */}
        <Route path="reportes" element={<ModulePlaceholder title="Reportes" rf="RF17" />} />
        {/* RF18 */}
        <Route path="auditoria" element={<ModulePlaceholder title="Trazabilidad y auditoría" rf="RF18" />} />
        {/* RF1 */}
        <Route path="usuarios" element={<ModulePlaceholder title="Gestión de usuarios" rf="RF1" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}