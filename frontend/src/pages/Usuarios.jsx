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
import { usuariosApi } from '../services/usuarios'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'
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

const SIN_FILTROS = { buscar: '', rol_id: '', estado: '' }

export default function Usuarios() {
  // Ficha del trabajador vinculado a la cuenta (clic en el nombre de usuario).
  const [verTrabajador, setVerTrabajador] = useState(null)
  // Búsqueda en el listado (desplegable).
  const {
    filtros,
    cambiar: cambiarFiltro,
    limpiar: limpiarFiltros,
    activos: filtrosActivos,
    hayFiltros,
  } = useFiltros(SIN_FILTROS)
  // HU-18: filtro explícito para consultar las cuentas dadas de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  // HU-01: solicitudes de contraseña esperando que el administrador entregue el
  // código (el sistema no envía correo en esta versión).
  const [solicitudes, setSolicitudes] = useState([])

  const { datos, setDatos, error, errorCarga, aviso, setAviso, recargar, ejecutar } = useRecurso(
    async () => {
      const [usuarios, roles, trabajadores] = await Promise.all([
        usuariosApi.listar({ incluirInactivos }),
        usuariosApi.roles(),
        usuariosApi.trabajadoresDisponibles(),
      ])
      return { usuarios, roles, trabajadores }
    },
    [incluirInactivos],
    { mensaje: 'No se pudo cargar la lista de usuarios.' },
  )
  const usuarios = datos?.usuarios ?? []
  const roles = datos?.roles ?? []
  const trabajadores = datos?.trabajadores ?? []
  // Solo la primera carga muestra «Cargando»; las recargas conservan la tabla.
  const cargando = datos === null && !errorCarga

  /** Cambia un usuario en la tabla sin volver a pedir la lista. */
  const actualizarUsuario = (id, cambios) =>
    setDatos((d) => ({ ...d, usuarios: d.usuarios.map((u) => (u.id === id ? { ...u, ...cambios } : u)) }))

  const cargarSolicitudes = () =>
    usuariosApi
      .solicitudesReset()
      .then(setSolicitudes)
      .catch(() => {})

  useEffect(() => {
    cargarSolicitudes()
  }, [incluirInactivos])

  const nuevo = useFormulario(VACIO, {
    enviar: (form) =>
      usuariosApi.crear({
        ...form,
        rol_id: Number(form.rol_id),
        trabajador_id: Number(form.trabajador_id),
      }),
    alGuardar: (_, { valores }) => {
      setAviso(`Usuario "${valores.username}" creado con cuenta activa.`)
      return recargar()
    },
    error: 'No se pudo crear el usuario.',
  })

  // Edición de usuario y correo (permiso usuarios.editar).
  const edicion = useFormulario(
    { username: '', email: '' },
    {
      enviar: (form, usuario) => usuariosApi.actualizar(usuario.id, form),
      alGuardar: (_, { valores }) => {
        setAviso(`Usuario "${valores.username}" actualizado.`)
        return recargar()
      },
      error: 'No se pudo actualizar el usuario.',
    },
  )

  // CU-01 Alt 3: asignar un rol distinto a un usuario existente.
  const cambiarRol = (usuario, rol_id) => {
    if (!rol_id || Number(rol_id) === usuario.rol_id) return
    ejecutar(
      async () => {
        const data = await usuariosApi.cambiarRol(usuario.id, Number(rol_id))
        actualizarUsuario(usuario.id, { rol_id: data.rol_id, rol: data.rol })
        return data
      },
      {
        exito: (data) => `${usuario.username}: rol cambiado a ${ROL_LABEL[data.rol] ?? data.rol}.`,
        error: `No se pudo cambiar el rol de ${usuario.username}.`,
        recargar: false,
      },
    )
  }

  const cambiarEstado = (usuario) => {
    const estado = usuario.estado === 'ACTIVO' ? 'BLOQUEADO' : 'ACTIVO'
    const leyenda = estado === 'BLOQUEADO' ? 'bloqueada' : 'activada'
    ejecutar(
      async () => {
        await usuariosApi.cambiarEstado(usuario.id, estado)
        actualizarUsuario(usuario.id, { estado })
      },
      {
        exito: `${usuario.username}: cuenta ${leyenda}.`,
        error: `No se pudo cambiar el estado de ${usuario.username}.`,
        recargar: false,
      },
    )
  }

  /** HU-18: reactivar una cuenta dada de baja (no se borra nunca). */
  const reactivar = (usuario) =>
    ejecutar(() => usuariosApi.reactivar(usuario.id), {
      exito: `${usuario.username}: cuenta reactivada.`,
      error: `No se pudo reactivar a ${usuario.username}.`,
    })

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

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargar} />}
        title="Gestión de usuarios"
        subtitle="Crear cuentas, asignar rol y controlar el acceso al sistema"
      >
        <button className="btn-primary" onClick={() => nuevo.abrir()}>
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
        {...nuevo.propsModal}
        titulo="Registrar usuario"
        subtitulo="Se crea con cuenta activa y el rol elegido"
        ancho="max-w-3xl"
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
              value={nuevo.valores.username}
              onChange={(e) => nuevo.cambiar('username', e.target.value)}
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
              value={nuevo.valores.email}
              onChange={(e) => nuevo.cambiar('email', e.target.value)}
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
              value={nuevo.valores.password}
              onChange={(e) => nuevo.cambiar('password', e.target.value)}
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
              value={nuevo.valores.rol_id}
              onChange={(e) => nuevo.cambiar('rol_id', e.target.value)}
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
              value={nuevo.valores.trabajador_id}
              onChange={(v) => nuevo.cambiar('trabajador_id', v)}
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
        activos={filtrosActivos}
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
              onChange={(e) => cambiarFiltro('buscar', e.target.value)}
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
              onChange={(e) => cambiarFiltro('rol_id', e.target.value)}
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
              onChange={(e) => cambiarFiltro('estado', e.target.value)}
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
            onClick={limpiarFiltros}
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
                        onClick={() => edicion.abrir({ username: u.username, email: u.email ?? '' }, u)}
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
        {...edicion.propsModal}
        titulo="Editar usuario"
        subtitulo="El rol y el estado se cambian aparte; la contraseña la restablece el propio usuario"
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
            className={edicion.claseCampo('username')}
            value={edicion.valores.username}
            onChange={(e) => edicion.cambiar('username', e.target.value)}
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
            className={edicion.claseCampo('email')}
            value={edicion.valores.email}
            onChange={(e) => edicion.cambiar('email', e.target.value)}
            required
          />
        </div>
      </ModalFormulario>
    </div>
  )
}
