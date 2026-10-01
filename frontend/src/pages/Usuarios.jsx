import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  KeyIcon,
  LockClosedIcon,
  PlusIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
import PageHeader from '../components/PageHeader.jsx'
import api from '../services/api'
import { mensajeError } from '../lib/errores.js'
import { fmtFechaHora } from '../lib/format.js'

/**
 * CU-01 (HU-01): Registrar usuario y asignar rol.
 * Actor: Administrador. La cuenta se crea ACTIVA; username o correo duplicado
 * devuelve error de validación; el administrador puede bloquear o activar una
 * cuenta existente en cualquier momento.
 *
 * HU-18: las cuentas dadas de baja no se borran. Con «Incluir dados de baja»
 * aparecen identificadas y se pueden reactivar; mientras estén inactivas no se
 * les cambia el rol (para eso primero se reactivan).
 */

const ESTADO_BADGE = {
  ACTIVO: 'bg-emerald-50 text-emerald-700',
  INACTIVO: 'bg-slate-100 text-slate-600',
  BLOQUEADO: 'bg-red-50 text-red-700',
}

const ROL_LABEL = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  MAESTRO_OBRA: 'Maestro de obra',
  ENCARGADO_BODEGA: 'Encargado de bodega',
}

const VACIO = { username: '', email: '', password: '', rol_id: '', trabajador_id: '' }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(VACIO)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  // CU-01 Alt 3: id del usuario cuyo rol se está editando en la tabla.
  const [editandoRol, setEditandoRol] = useState(null)
  // HU-18: filtro explícito para consultar las cuentas dadas de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  // HU-01: solicitudes de contraseña esperando que el administrador entregue el
  // código (el sistema no envía correo en esta versión).
  const [solicitudes, setSolicitudes] = useState([])

  const cargar = async () => {
    const [u, r, t] = await Promise.all([
      api.get('/usuarios', { params: incluirInactivos ? { incluirInactivos: 1 } : {} }),
      api.get('/usuarios/roles'),
      api.get('/usuarios/trabajadores-disponibles'),
    ])
    setUsuarios(u.data)
    setRoles(r.data)
    setTrabajadores(t.data)
    setCargando(false)
  }

  const cargarSolicitudes = () => {
    api
      .get('/usuarios/solicitudes-reset')
      .then((res) => setSolicitudes(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    cargar().catch(() => {
      setError('No se pudo cargar la lista de usuarios.')
      setCargando(false)
    })
    cargarSolicitudes()
  }, [incluirInactivos])

  const crear = async (e) => {
    e.preventDefault()
    setErrorForm('')
    setGuardando(true)
    try {
      await api.post('/usuarios', {
        ...form,
        rol_id: Number(form.rol_id),
        trabajador_id: Number(form.trabajador_id),
      })
      setForm(VACIO)
      setAbierto(false)
      setAviso(`Usuario "${form.username}" creado con cuenta activa.`)
      await cargar()
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo crear el usuario.'))
    } finally {
      setGuardando(false)
    }
  }

  // CU-01 Alt 3: asignar un rol distinto a un usuario existente.
  const cambiarRol = async (usuario, rol_id) => {
    setError('')
    setAviso('')
    if (!rol_id || Number(rol_id) === usuario.rol_id) {
      setEditandoRol(null)
      return
    }
    try {
      const { data } = await api.patch(`/usuarios/${usuario.id}/rol`, { rol_id: Number(rol_id) })
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, rol_id: data.rol_id, rol: data.rol } : u)),
      )
      setAviso(`${usuario.username}: rol cambiado a ${ROL_LABEL[data.rol] ?? data.rol}.`)
    } catch (err) {
      setError(mensajeError(err, `No se pudo cambiar el rol de ${usuario.username}.`))
    } finally {
      setEditandoRol(null)
    }
  }

  const cambiarEstado = async (usuario) => {
    const estado = usuario.estado === 'ACTIVO' ? 'BLOQUEADO' : 'ACTIVO'
    const leyenda = estado === 'BLOQUEADO' ? 'bloqueada' : 'activada'
    setError('')
    setAviso('')
    try {
      await api.patch(`/usuarios/${usuario.id}/estado`, { estado })
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, estado } : u)))
      setAviso(`${usuario.username}: cuenta ${leyenda}.`)
    } catch (err) {
      setError(mensajeError(err, `No se pudo cambiar el estado de ${usuario.username}.`))
    }
  }

  /** HU-18: reactivar una cuenta dada de baja (no se borra nunca). */
  const reactivar = async (usuario) => {
    setError('')
    setAviso('')
    try {
      await api.patch(`/usuarios/${usuario.id}/reactivar`)
      setAviso(`${usuario.username}: cuenta reactivada.`)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, `No se pudo reactivar a ${usuario.username}.`))
    }
  }

  const etiquetaRol = (u) => ROL_LABEL[u.rol] ?? u.rol ?? 'Sin rol'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de usuarios"
        subtitle="Crear cuentas, asignar rol y controlar el acceso al sistema · RF01 · CU-01"
      >
        <button className="btn-primary" onClick={() => setAbierto((v) => !v)}>
          <PlusIcon className="h-5 w-5" />
          Nuevo usuario
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setIncluirInactivos((v) => !v)}
        >
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
        <button type="button" onClick={cargar} className="btn-ghost inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" /> Actualizar
        </button>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {/* HU-01: códigos de recuperación pendientes. */}
      {solicitudes.length > 0 && (
        <div className="card border-l-4 border-accent-400 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5 text-brand-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Solicitudes de contraseña ({solicitudes.length})
              </h3>
            </div>
            <button type="button" onClick={cargarSolicitudes} className="btn-ghost text-xs">
              Actualizar solicitudes
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Entregue el código a la persona: lo necesita en «¿Olvidó su contraseña?» del login. Cada
            código sirve una sola vez y vence.
          </p>

          <ul className="mt-4 space-y-3">
            {solicitudes.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-100 bg-accent-50/60 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {s.username} · {s.trabajador || 'sin ficha de trabajador'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.email} · solicitada el {fmtFechaHora(s.solicitado_en)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold tracking-widest text-brand-900 ring-1 ring-accent-200">
                    {s.codigo}
                  </code>
                  <span className="badge bg-white text-brand-700 ring-1 ring-accent-200">
                    vence en {s.minutos_restantes} min
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {abierto && (
        <form onSubmit={crear} className="card space-y-5 p-6">
          <div className="flex items-center gap-2 text-slate-900">
            <UserPlusIcon className="h-5 w-5 text-brand-600" />
            <h3 className="text-base font-semibold">Registrar usuario y asignar rol</h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="u-username" className="label">
                Usuario
              </label>
              <input
                id="u-username"
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="u-email" className="label">
                Correo empresarial
              </label>
              <input
                id="u-email"
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="u-password" className="label">
                Contraseña
              </label>
              <input
                id="u-password"
                type="password"
                className="input"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Mínimo 8 caracteres. Se almacena cifrada (RNF04).
              </p>
            </div>
            <div>
              <label htmlFor="u-rol" className="label">
                Rol
              </label>
              <select
                id="u-rol"
                className="input"
                value={form.rol_id}
                onChange={(e) => setForm({ ...form, rol_id: e.target.value })}
                required
              >
                <option value="">Seleccione un rol…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {ROL_LABEL[r.nombre] ?? r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="u-trabajador" className="label">
                Trabajador
              </label>
              {/* Combobox con búsqueda: la lista de trabajadores crece. */}
              <BuscadorSelect
                id="u-trabajador"
                value={form.trabajador_id}
                onChange={(v) => setForm({ ...form, trabajador_id: v })}
                opciones={trabajadores.map((t) => ({
                  value: t.id,
                  label: `${t.nombres} ${t.apellidos}`,
                  sublabel: `${t.numero_documento}${t.cargo ? ` · ${t.cargo}` : ''}`,
                }))}
                placeholder="Escriba el nombre o el documento…"
                requerido
              />
              <p className="mt-1 text-xs text-slate-500">
                {trabajadores.length === 0
                  ? 'No hay trabajadores sin cuenta disponibles.'
                  : 'Cada cuenta se vincula a un trabajador y solo puede tener una.'}
              </p>
            </div>
          </div>

          <AlertaFormulario mensaje={errorForm} />

          <div className="flex items-center gap-3">
            <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
              {guardando ? 'Creando…' : 'Crear usuario'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setAbierto(false)
                setForm(VACIO)
                setErrorForm('')
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">Cargando usuarios…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-5 py-3.5 font-semibold">Usuario</th>
                  <th className="px-5 py-3.5 font-semibold">Correo empresarial</th>
                  <th className="px-5 py-3.5 font-semibold">Rol</th>
                  <th className="px-5 py-3.5 font-semibold">Estado</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className={u.activo ? '' : 'bg-slate-50/60'}>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {u.username}
                      {!u.activo && (
                        <span className="badge ml-2 bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                          Dado de baja
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{u.email}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {/* A una cuenta dada de baja no se le cambia el rol: se muestra
                          su rol tal cual (nunca un número de relleno). */}
                      {editandoRol === u.id && u.activo ? (
                        <select
                          className="input py-1 text-sm"
                          aria-label={`Rol de ${u.username}`}
                          defaultValue={u.rol_id}
                          autoFocus
                          onBlur={() => setEditandoRol(null)}
                          onChange={(e) => cambiarRol(u, e.target.value)}
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {ROL_LABEL[r.nombre] ?? r.nombre}
                            </option>
                          ))}
                        </select>
                      ) : u.activo ? (
                        <button
                          type="button"
                          className="rounded px-1 text-left hover:bg-slate-100 hover:underline"
                          title="Cambiar rol"
                          onClick={() => setEditandoRol(u.id)}
                        >
                          {etiquetaRol(u)}
                        </button>
                      ) : (
                        <span>{etiquetaRol(u)}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          ESTADO_BADGE[u.estado] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {u.activo ? (
                        <button
                          onClick={() => cambiarEstado(u)}
                          className="btn-ghost ml-auto text-xs"
                          aria-label={
                            u.estado === 'ACTIVO' ? `Bloquear a ${u.username}` : `Activar a ${u.username}`
                          }
                        >
                          {u.estado === 'ACTIVO' ? (
                            <>
                              <LockClosedIcon className="h-4 w-4" />
                              Bloquear
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4" />
                              Activar
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivar(u)}
                          className="btn-ghost ml-auto text-xs"
                          aria-label={`Reactivar a ${u.username}`}
                        >
                          <ArrowPathIcon className="h-4 w-4" /> Reactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
