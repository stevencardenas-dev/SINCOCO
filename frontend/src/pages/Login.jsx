import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // RF1: autenticación real llega con el backend (JWT).
    login(email || 'admin@scopi.co')
    navigate('/')
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-12 lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-xl font-extrabold text-white shadow-lg shadow-brand-600/40">
            S
          </div>
          <div>
            <p className="text-lg font-bold text-white">SCOPI</p>
            <p className="text-xs text-slate-400">Sistema de Control de Obras, Personal e Inventarios</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
            Planee, ejecute y dé trazabilidad a sus obras.
          </h2>
          <p className="mt-4 text-slate-400">
            Proyectos, personal, materiales, herramientas, proveedores y costos en un solo lugar, con alertas e
            indicadores para decidir mejor. Constructora XYZ · Cúcuta.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {['Trazabilidad total', 'Alertas de inventario', 'Dashboard gerencial', 'Reportes PDF/Excel'].map((f) => (
              <span
                key={f}
                className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">
          Proyecto académico · Control integral de proyectos de construcción
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-xl font-extrabold text-white">
                S
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">SCOPI</p>
                <p className="text-xs text-slate-500">Control de proyectos de construcción</p>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
          <p className="mt-1.5 text-sm text-slate-500">Ingrese sus credenciales para acceder al sistema.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="label">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="admin@scopi.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Recordarme
              </label>
              <a href="#" className="font-semibold text-brand-600 hover:text-brand-700">
                ¿Olvidó su contraseña?
              </a>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3">
              Ingresar
            </button>
          </form>

          <p className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-700">
            <strong>Demo:</strong> ingrese con cualquier correo. La autenticación real (RF1 · JWT · RBAC) se conecta
            cuando exista el backend.
          </p>
        </div>
      </div>
    </div>
  )
}