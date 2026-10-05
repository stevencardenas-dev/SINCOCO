import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  KeyIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
import CampoPassword from '../components/CampoPassword.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import Ficha, { TablaFicha } from '../components/Ficha.jsx'
import { telefonoLegible } from '../components/TelefonoPais.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import FilaVacia from '../components/FilaVacia.jsx'
import PageHeader from '../components/PageHeader.jsx'
import api from '../services/api'
import { campoError, mensajeError } from '../lib/errores.js'
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
  // Ficha del trabajador vinculado a la cuenta (clic en el nombre de usuario).
  const [verTrabajador, setVerTrabajador] = useState(null)
  // Búsqueda en el listado (desplegable).
  const [filtros, setFiltros] = useState({ buscar: '', rol_id: '', estado: '' })
  // Edición de usuario y correo (permiso usuarios.editar).
  const [editando, setEditando] = useState(null)
  const [formEditar, setFormEditar] = useState({ username: '', email: '' })
  const [errorEditar, setErrorEditar] = useState('')
  const [campoEditar, setCampoEditar] = useState(null)
  const [guardandoEditar, setGuardandoEditar] = useState(false)
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

  const cargarSolicitudes = () =>
    api
      .get('/usuarios/solicitudes-reset')
      .then((res) => setSolicitudes(res.data))
      .catch(() => {})

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

  const cerrarCrear = () => {
    setAbierto(false)
    setForm(VACIO)
    setErrorForm('')
  }

  // CU-01 Alt 3: asignar un rol distinto a un usuario existente.
  const cambiarRol = async (usuario, rol_id) => {
    setError('')
    setAviso('')
    if (!rol_id || Number(rol_id) === usuario.rol_id) return
    try {
      const { data } = await api.patch(`/usuarios/${usuario.id}/rol`, { rol_id: Number(rol_id) })
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, rol_id: data.rol_id, rol: data.rol } : u)),
      )
      setAviso(`${usuario.username}: rol cambiado a ${ROL_LABEL[data.rol] ?? data.rol}.`)
    } catch (err) {
      setError(mensajeError(err, `No se pudo cambiar el rol de ${usuario.username}.`))
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

  const abrirEditar = (u) => {
    setFormEditar({ username: u.username, email: u.email ?? '' })
    setErrorEditar('')
    setCampoEditar(null)
    setEditando(u)
  }

  const guardarEdicion = async (e) => {
    e.preventDefault()
    setErrorEditar('')
    setCampoEditar(null)
    setGuardandoEditar(true)
    try {
      await api.patch(`/usuarios/${editando.id}`, formEditar)
      setAviso(`Usuario "${formEditar.username}" actualizado.`)
      setEditando(null)
      await cargar()
    } catch (err) {
      setErrorEditar(mensajeError(err, 'No se pudo actualizar el usuario.'))
      setCampoEditar(campoError(err))
    } finally {
      setGuardandoEditar(false)
    }
  }

  const etiquetaRol = (u) => ROL_LABEL[u.rol] ?? u.rol ?? 'Sin rol'

  const texto = filtros.buscar.trim().toLowerCase()
  const visibles = usuarios.filter(
    (u) =>
      (!texto ||
        u.username.toLowerCase().includes(texto) ||
        (u.email ?? '').toLowerCase().includes(texto)) &&
      (!filtros.rol_id || String(u.rol_id) === filtros.rol_id) &&
      (!filtros.estado || u.estado === filtros.estado),
  )
  const hayFiltros = Boolean(filtros.buscar || filtros.rol_id || filtros.estado)

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={() => cargar().catch(() => { setError('No se pudo cargar la lista de usuarios.') }) } />}
        title="Gestión de usuarios"
        subtitle="Crear cuentas, asignar rol y controlar el acceso al sistema"
      >
        <button className="btn-primary" onClick={() => setAbierto(true)}>
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
            <BotonActualizar onClick={cargarSolicitudes} titulo="Actualizar solicitudes" />
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

      <ModalFormulario
        abierto={abierto}
        titulo="Registrar usuario"
        subtitulo="Se crea con cuenta activa y el rol elegido"
        onCerrar={cerrarCrear}
        ancho="max-w-3xl"
        onGuardar={crear}
        guardando={guardando}
        error={errorForm}
        textoGuardar="Crear usuario"
        textoGuardando="Creando…"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="u-username" className="label">
              Usuario
            </label>
            <input
              id="u-username"
              maxLength={50}
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
              maxLength={150}
              type="email"
              placeholder="correo@sincoco.com"
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
            <CampoPassword
              id="u-password"
              maxLength={72}
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Mínimo 8 caracteres. Se almacena cifrada.
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
      </ModalFormulario>

      <FiltrosDesplegable
        titulo="Buscar usuarios"
        ariaLabel="Filtros de usuarios"
        activos={[filtros.buscar, filtros.rol_id, filtros.estado].filter(Boolean).length}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label htmlFor="usr-buscar" className="label">
              Búsqueda
            </label>
            <input
              id="usr-buscar"
              type="search"
              className="input"
              placeholder="Usuario o correo"
              value={filtros.buscar}
              onChange={(e) => setFiltros((f) => ({ ...f, buscar: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="usr-rol" className="label">
              Rol
            </label>
            <select
              id="usr-rol"
              className="input"
              value={filtros.rol_id}
              onChange={(e) => setFiltros((f) => ({ ...f, rol_id: e.target.value }))}
            >
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {ROL_LABEL[r.nombre] ?? r.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="usr-estado" className="label">
              Estado
            </label>
            <select
              id="usr-estado"
              className="input"
              value={filtros.estado}
              onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
            >
              <option value="">Todos</option>
              {Object.keys(ESTADO_BADGE).map((e2) => (
                <option key={e2} value={e2}>
                  {e2}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-ghost"
            disabled={!hayFiltros}
            onClick={() => setFiltros({ buscar: '', rol_id: '', estado: '' })}
          >
            Limpiar filtros
          </button>
          <p className="text-xs text-slate-500">
            {visibles.length} {visibles.length === 1 ? 'usuario' : 'usuarios'}{' '}
            {hayFiltros ? 'con los filtros aplicados' : 'en la lista'}
          </p>
        </div>
      </FiltrosDesplegable>

      {cargando ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-500">Cargando usuarios…</div>
      ) : (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={visibles}
            minWidth="md:min-w-[680px]"
            theadClase="text-slate-500"
            filaClase={(u) => (u.activo ? '' : 'bg-slate-50/60')}
            vacia={<FilaVacia columnas={6}>No hay usuarios que mostrar con estos filtros.</FilaVacia>}
            ficha={{
              titulo: (u) => u.username,
              subtitulo: (u) => etiquetaRol(u),
            }}
            columnas={[
              {
                titulo: 'Usuario',
                movil: true,
                tdClase: 'font-medium text-slate-800',
                celda: (u) => (
                  <>
                    <button
                      type="button"
                      className="rounded px-1 text-left font-medium hover:bg-slate-100 hover:underline"
                      title="Ver datos del trabajador"
                      onClick={() => setVerTrabajador(u)}
                    >
                      {u.username}
                    </button>
                    {!u.activo && (
                      <span className="badge ml-2 bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                        Dado de baja
                      </span>
                    )}
                  </>
                ),
              },
              { titulo: 'Correo empresarial', tdClase: 'text-slate-600', celda: (u) => u.email },
              {
                titulo: 'Rol',
                movil: true,
                tdClase: 'text-slate-600',
                // A una cuenta dada de baja no se le cambia el rol: se muestra
                // su rol tal cual (nunca un número de relleno).
                celda: (u) =>
                  u.activo ? (
                    <select
                      // Mismo formato que el selector de «Estado» en Personal.
                      className="input -my-1 block w-48 py-1 pl-2.5 text-xs"
                      aria-label={`Rol de ${u.username}`}
                      value={u.rol_id}
                      onChange={(e) => cambiarRol(u, e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {ROL_LABEL[r.nombre] ?? r.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>{etiquetaRol(u)}</span>
                  ),
              },
              {
                titulo: 'Estado',
                celda: (u) => (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ESTADO_BADGE[u.estado] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {u.estado}
                  </span>
                ),
              },
              {
                titulo: 'Acciones',
                acciones: true,
                derecha: true,
                celda: (u, enFicha) => {
                  const botones = u.activo ? (
                    <>
                      <button
                        type="button"
                        onClick={() => abrirEditar(u)}
                        className="btn-accion btn-accion-editar"
                        aria-label={`Editar a ${u.username}`}
                      >
                        <PencilSquareIcon className="h-4 w-4" /> Editar
                      </button>
                      <button
                        onClick={() => cambiarEstado(u)}
                        className={`btn-accion ${u.estado === 'ACTIVO' ? 'btn-accion-peligro' : 'btn-accion-ok'}`}
                        aria-label={u.estado === 'ACTIVO' ? `Bloquear a ${u.username}` : `Activar a ${u.username}`}
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
                    </>
                  ) : (
                    <button onClick={() => reactivar(u)} className="btn-ghost text-xs" aria-label={`Reactivar a ${u.username}`}>
                      <ArrowPathIcon className="h-4 w-4" /> Reactivar
                    </button>
                  )
                  return enFicha ? (
                    botones
                  ) : (
                    <div className="flex flex-wrap items-center justify-end gap-2">{botones}</div>
                  )
                },
              },
            ]}
          />
        </div>
      )}

      {verTrabajador && (
        <Ficha
          titulo={verTrabajador.trabajador || 'Sin trabajador'}
          subtitulo={`Cuenta ${verTrabajador.username}`}
          onCerrar={() => setVerTrabajador(null)}
          campos={
            verTrabajador.trabajador
              ? [
                  ['Documento', `${verTrabajador.trab_tipo_documento} ${verTrabajador.trab_numero_documento}`],
                  ['Cargo', verTrabajador.trab_cargo],
                  ['Especialidad', verTrabajador.trab_especialidad],
                  ['Correo', verTrabajador.trab_email],
                  ['Teléfono', verTrabajador.trab_telefono ? telefonoLegible(verTrabajador.trab_telefono) : null],
                  ['Dirección', verTrabajador.trab_direccion],
                  ['Estado', verTrabajador.trab_activo ? verTrabajador.trab_estado : 'Inactivo · de baja'],
                ]
              : [['Trabajador', 'Esta cuenta no está vinculada a un trabajador']]
          }
        />
      )}

      <ModalFormulario
        abierto={editando !== null}
        titulo="Editar usuario"
        subtitulo="El rol y el estado se cambian aparte; la contraseña la restablece el propio usuario"
        onCerrar={() => setEditando(null)}
        onGuardar={guardarEdicion}
        guardando={guardandoEditar}
        error={errorEditar}
        campoError={campoEditar}
        textoGuardar="Guardar cambios"
        espaciado="space-y-4"
      >
        <div>
          <label htmlFor="ue-username" className="label">
            Usuario
          </label>
          <input
            id="ue-username"
            maxLength={50}
            className={campoEditar === 'username' ? 'input border-red-400' : 'input'}
            value={formEditar.username}
            onChange={(e) => setFormEditar({ ...formEditar, username: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="ue-email" className="label">
            Correo empresarial
          </label>
          <input
            id="ue-email"
            type="email"
            maxLength={150}
            className={campoEditar === 'email' ? 'input border-red-400' : 'input'}
            value={formEditar.email}
            onChange={(e) => setFormEditar({ ...formEditar, email: e.target.value })}
            required
          />
        </div>
      </ModalFormulario>
    </div>
  )
}
