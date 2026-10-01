import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // ¿Olvidó su contraseña? (HU-01): pedir el código y definir la contraseña nueva.
  const [recuperarAbierto, setRecuperarAbierto] = useState(false)
  const [paso, setPaso] = useState('pedir')
  const [recuperar, setRecuperar] = useState({ usuario: '', codigo: '', password: '', repetir: '' })
  const [errorRecuperar, setErrorRecuperar] = useState('')
  const [guardandoRecuperar, setGuardandoRecuperar] = useState(false)

  /**
   * ¿Olvidó su contraseña? — paso 1: registrar la solicitud.
   *
   * El sistema no envía correo en esta versión: el código lo entrega el
   * administrador, que lo ve en el módulo de Usuarios.
   */
  const pedirCodigo = async (e) => {
    e.preventDefault()
    setErrorRecuperar('')
    setGuardandoRecuperar(true)
    try {
      await api.post('/auth/solicitar-reset', { usuario: recuperar.usuario })
      setPaso('cambiar')
    } catch (err) {
      setErrorRecuperar(err.response?.data?.error ?? 'No se pudo registrar la solicitud.')
    } finally {
      setGuardandoRecuperar(false)
    }
  }

  /** Paso 2: definir la contraseña nueva con el código recibido. */
  const restablecer = async (e) => {
    e.preventDefault()
    setErrorRecuperar('')
    if (recuperar.password !== recuperar.repetir) {
      setErrorRecuperar('La contraseña nueva y su confirmación no coinciden.')
      return
    }
    setGuardandoRecuperar(true)
    try {
      await api.post('/auth/restablecer', {
        usuario: recuperar.usuario,
        codigo: recuperar.codigo,
        password: recuperar.password,
      })
      setPaso('listo')
      setUsername(recuperar.usuario)
      setPassword('')
      setRecuperar({ usuario: recuperar.usuario, codigo: '', password: '', repetir: '' })
    } catch (err) {
      setErrorRecuperar(err.response?.data?.error ?? 'No se pudo restablecer la contraseña.')
    } finally {
      setGuardandoRecuperar(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const res = await login(username, password)
    setEnviando(false)
    if (res.ok) navigate('/')
    else setError(res.error)
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-900 p-12 lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-accent-400/25 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <div>
            <p className="text-lg font-bold text-white">SINCOCO</p>
            <p className="text-xs text-slate-400">Sistema de Información para el Control Integral de Proyectos de Construcción, Inventarios y Personal</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
            Planee, ejecute y dé{' '}
            <span className="text-accent-300">trazabilidad</span> a sus obras.
          </h2>
          <p className="mt-4 text-slate-400">
            Proyectos, personal, materiales, herramientas, proveedores y costos en un solo lugar, con alertas e
            indicadores para decidir mejor. Constructora XYZ · Cúcuta.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {['Trazabilidad total', 'Alertas de inventario', 'Dashboard gerencial', 'Reportes PDF/Excel'].map((f) => (
              <span
                key={f}
                className="rounded-full border border-brand-700 bg-brand-800/60 px-3 py-1 text-xs font-medium text-slate-300"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-400">
          Proyecto académico · Control integral de proyectos de construcción
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">            <div className="flex items-center gap-3">
              <Logo className="h-11 w-11" />
              <div>
                <p className="text-lg font-bold text-slate-900">SINCOCO</p>
                <p className="text-xs text-slate-500">Control de proyectos de construcción</p>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
          <p className="mt-1.5 text-sm text-slate-500">Ingrese sus credenciales para acceder al sistema.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="username" className="label">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="input"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 focus:ring-accent-400" />
                Recordarme
              </label>
              <button
                type="button"
                onClick={() => { setRecuperarAbierto(true); setPaso('pedir'); setErrorRecuperar('') }}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="btn-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            El acceso y el menú dependen del rol asignado a cada cuenta.
          </p>
        </div>
      </div>

      {/* HU-01 · «¿Olvidó su contraseña?»: dos pasos, sin correo saliente. */}
      <Modal
        abierto={recuperarAbierto}
        titulo={paso === 'listo' ? 'Contraseña restablecida' : 'Recuperar contraseña'}
        subtitulo={paso === 'pedir'
          ? 'Escriba su usuario o su correo empresarial'
          : paso === 'cambiar'
            ? 'Escriba el código que le entregó el administrador y su contraseña nueva'
            : ''}
        onCerrar={() => { setRecuperarAbierto(false); setErrorRecuperar('') }}
      >
        {paso === 'pedir' && (
          <form onSubmit={pedirCodigo} className="space-y-4">
            <div>
              <label htmlFor="r-usuario" className="label">Usuario o correo empresarial</label>
              <input id="r-usuario" className="input" value={recuperar.usuario}
                onChange={(e) => setRecuperar({ ...recuperar, usuario: e.target.value })}
                placeholder="admin" required />
            </div>
            <p className="rounded-xl bg-accent-50 px-4 py-3 text-xs leading-relaxed text-brand-800 ring-1 ring-accent-200">
              Se genera un código de un solo uso válido por 30 minutos. Como el sistema no envía
              correo, el administrador lo verá en el módulo de Usuarios y se lo entregará.
            </p>

            {errorRecuperar && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorRecuperar}
              </p>
            )}

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button type="submit" disabled={guardandoRecuperar} className="btn-primary disabled:opacity-60">
                {guardandoRecuperar ? 'Enviando…' : 'Solicitar código'}
              </button>
              <button type="button" className="btn-ghost"
                onClick={() => { setRecuperarAbierto(false); setErrorRecuperar('') }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {paso === 'cambiar' && (
          <form onSubmit={restablecer} className="space-y-4">
            <div>
              <label htmlFor="r-usuario2" className="label">Usuario o correo empresarial</label>
              <input id="r-usuario2" className="input" value={recuperar.usuario}
                onChange={(e) => setRecuperar({ ...recuperar, usuario: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="r-codigo" className="label">Código de recuperación</label>
              <input id="r-codigo" className="input uppercase tracking-widest" value={recuperar.codigo}
                onChange={(e) => setRecuperar({ ...recuperar, codigo: e.target.value })}
                placeholder="XXXX-XXXX" required />
              <p className="mt-1 text-xs text-slate-500">
                Vence a los 30 minutos y admite 5 intentos. Si se agota, solicite otro.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="r-password" className="label">Nueva contraseña</label>
                <input id="r-password" type="password" autoComplete="new-password" className="input"
                  minLength={8} value={recuperar.password}
                  onChange={(e) => setRecuperar({ ...recuperar, password: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="r-repetir" className="label">Confirmar contraseña</label>
                <input id="r-repetir" type="password" autoComplete="new-password" className="input"
                  minLength={8} value={recuperar.repetir}
                  onChange={(e) => setRecuperar({ ...recuperar, repetir: e.target.value })} required />
              </div>
            </div>

            {errorRecuperar && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorRecuperar}
              </p>
            )}

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button type="submit" disabled={guardandoRecuperar} className="btn-primary disabled:opacity-60">
                {guardandoRecuperar ? 'Guardando…' : 'Restablecer contraseña'}
              </button>
              <button type="button" className="btn-ghost"
                onClick={() => { setPaso('pedir'); setErrorRecuperar('') }}>
                Solicitar otro código
              </button>
            </div>
          </form>
        )}

        {paso === 'listo' && (
          <div className="space-y-4">
            <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Su contraseña quedó actualizada. Ya puede ingresar con ella.
            </p>
            <p className="text-sm text-slate-500">
              El cambio quedó registrado en la bitácora de trazabilidad.
            </p>
            <div className="border-t border-slate-100 pt-4">
              <button type="button" className="btn-primary"
                onClick={() => { setRecuperarAbierto(false); setPaso('pedir') }}>
                Ir a iniciar sesión
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}