import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import Ficha, { CeldaFicha, EncabezadoFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SelectorUbicacion from '../components/SelectorUbicacion.jsx'
import TelefonoPais, { telefonoLegible } from '../components/TelefonoPais.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'
import { campoError, mensajeError } from '../lib/errores.js'
import { fmtFecha, soloDigitos } from '../lib/format.js'

/**
 * HU-04 (RF06 · RF07): registrar el personal con su cargo y especialidad.
 *
 * El cargo y la especialidad salen de los catálogos `cargos` y `especialidades`
 * (GET /api/catalogos). Si el valor no existe, se registra ahí mismo.
 *
 * Dos reglas de negocio viven en el backend y aquí solo se reflejan:
 *   - al crear, el trabajador queda ACTIVO y disponible;
 *   - la disponibilidad se deriva del estado y de las actividades asignadas.
 *     Por eso no hay casilla «Disponible para asignación»: el estado es lo que
 *     el usuario cambia y el sistema calcula el resto.
 *
 * Retirar a una persona no es un estado: es «Dar de baja» (HU-18), desde el
 * formulario de edición y con confirmación. El trabajador queda Inactivo, sale
 * de la lista y su cuenta se bloquea; se reactiva desde «Incluir dados de baja».
 */

const VACIO = {
  numero_documento: '',
  tipo_documento: 'CC',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  direccion: '',
  cargo_id: '',
  especialidad_id: '',
  estado: 'ACTIVO',
}

// Estados que se eligen a mano. INACTIVO solo lo deja «Dar de baja».
const ESTADOS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'VACACIONES', label: 'Vacaciones' },
  { value: 'LICENCIA', label: 'Licencia' },
]

const ESTADO_BADGE = {
  ACTIVO: 'bg-emerald-50 text-emerald-700',
  INACTIVO: 'bg-slate-100 text-slate-600',
  VACACIONES: 'bg-amber-50 text-amber-700',
  LICENCIA: 'bg-sky-50 text-sky-700',
}

const CATALOGO_TITULO = {
  cargos: 'Registrar un cargo',
  especialidades: 'Registrar una especialidad',
}

const SIN_FILTROS = { buscar: '', estado: '', cargo_id: '', disponible: '' }

export default function Personal() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'ADMINISTRADOR'

  const [personal, setPersonal] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [campoForm, setCampoForm] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [abierto, setAbierto] = useState(false)
  const [mapaAbierto, setMapaAbierto] = useState(false)
  // Trabajador en edición: null = el formulario está registrando uno nuevo.
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  // HU-18: por defecto no se muestran los registros dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [filtros, setFiltros] = useState(SIN_FILTROS)
  // Celular: la tabla conserva pocas columnas y el resto va en la ficha.
  const [ficha, setFicha] = useState(null)

  // Catálogos del cargo y la especialidad.
  const [cargos, setCargos] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [nuevoCatalogo, setNuevoCatalogo] = useState(null)
  const [catalogoForm, setCatalogoForm] = useState({ nombre: '', descripcion: '', operativo: false })
  const [errorCatalogo, setErrorCatalogo] = useState('')
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false)

  // HU-18: confirmación de «Dar de baja» (el trabajador que se va a retirar).
  const [porDarDeBaja, setPorDarDeBaja] = useState(null)
  const [errorBaja, setErrorBaja] = useState('')
  const [dandoDeBaja, setDandoDeBaja] = useState(false)

  const cargar = () => {
    setError('')
    return api
      .get('/trabajadores', {
        params: {
          ...(incluirInactivos ? { incluirInactivos: 1 } : {}),
          ...(filtros.buscar ? { buscar: filtros.buscar } : {}),
          ...(filtros.estado ? { estado: filtros.estado } : {}),
          ...(filtros.cargo_id ? { cargo_id: filtros.cargo_id } : {}),
          ...(filtros.disponible !== '' ? { disponible: filtros.disponible } : {}),
        },
      })
      .then((res) => setPersonal(res.data))
      .catch(() => setError('No se pudo cargar el personal.'))
  }

  const cargarCatalogos = () => {
    api.get('/catalogos/cargos').then((res) => setCargos(res.data)).catch(() => {})
    api.get('/catalogos/especialidades').then((res) => setEspecialidades(res.data)).catch(() => {})
  }

  useEffect(() => {
    cargar()
  }, [incluirInactivos, filtros])
  useEffect(cargarCatalogos, [])

  /** Cambiar el estado reemplaza al «dar de baja»: la disponibilidad se deriva. */
  const cambiarEstado = async (t, estado) => {
    setError('')
    setAviso('')
    if (estado === t.estado) return
    try {
      const { data } = await api.patch(`/trabajadores/${t.id}/estado`, { estado })
      const actualizado = data.trabajador
      setAviso(
        `${t.nombres} ${t.apellidos}: estado ${actualizado.estado}` +
          (Number(actualizado.disponible) ? ' · disponible' : ' · no disponible'),
      )
      cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cambiar el estado del trabajador.'))
      cargar()
    }
  }

  /** CU-04: registrar o actualizar el personal con su cargo y especialidad. */
  const guardar = async (e) => {
    e.preventDefault()
    setErrorForm('')
    setCampoForm(null)
    setGuardando(true)
    try {
      const cuerpo = {
        ...form,
        numero_documento: soloDigitos(form.numero_documento),
        cargo_id: Number(form.cargo_id),
        especialidad_id: form.especialidad_id ? Number(form.especialidad_id) : null,
      }
      const { data } = editando
        ? await api.patch(`/trabajadores/${editando}`, cuerpo)
        : await api.post('/trabajadores', cuerpo)
      const t = data.trabajador
      setAviso(
        editando
          ? `${t.nombres} ${t.apellidos}: información actualizada (${t.cargo}).`
          : `${t.nombres} ${t.apellidos} registrado como ${t.cargo}.`,
      )
      cerrarFormulario()
      cargar()
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo guardar el trabajador.'))
      setCampoForm(campoError(err))
    } finally {
      setGuardando(false)
    }
  }

  const cerrarFormulario = () => {
    setAbierto(false)
    setEditando(null)
    setForm(VACIO)
    setErrorForm('')
    setCampoForm(null)
  }

  /** Pasa el trabajador a edición: el formulario se abre con sus datos actuales. */
  const abrirEditar = (t) => {
    setAviso('')
    setErrorForm('')
    setCampoForm(null)
    setEditando(t.id)
    setForm({
      numero_documento: t.numero_documento ?? '',
      tipo_documento: t.tipo_documento ?? 'CC',
      nombres: t.nombres ?? '',
      apellidos: t.apellidos ?? '',
      email: t.email ?? '',
      telefono: t.telefono ?? '',
      direccion: t.direccion ?? '',
      cargo_id: String(t.cargo_id ?? ''),
      especialidad_id: t.especialidad_id ? String(t.especialidad_id) : '',
      estado: t.estado ?? 'ACTIVO',
    })
    setAbierto(true)
  }

  /** «⚠️ Dar de baja» del formulario de edición: abre la confirmación encima. */
  const pedirBaja = () => {
    setErrorBaja('')
    setPorDarDeBaja(personal?.find((t) => t.id === editando) ?? null)
  }

  /** HU-18: baja lógica. El backend la rechaza si tiene trabajo en curso a su cargo. */
  const confirmarBaja = async () => {
    const t = porDarDeBaja
    setErrorBaja('')
    setDandoDeBaja(true)
    try {
      const { data } = await api.patch(`/trabajadores/${t.id}/baja`)
      setPorDarDeBaja(null)
      cerrarFormulario()
      setError('')
      setAviso(
        `Se dio de baja a ${t.nombres} ${t.apellidos}.` +
          (data.cuenta_bloqueada ? ` Su cuenta «${data.cuenta_bloqueada}» quedó bloqueada.` : ''),
      )
      cargar()
    } catch (err) {
      setErrorBaja(mensajeError(err, 'No se pudo dar de baja al trabajador.'))
    } finally {
      setDandoDeBaja(false)
    }
  }

  /** HU-18: vuelve a la operación como Activo (y reabre la cuenta que cerró la baja). */
  const reactivar = async (t) => {
    setError('')
    setAviso('')
    try {
      const { data } = await api.patch(`/trabajadores/${t.id}/reactivar`)
      setAviso(
        `Se reactivó a ${t.nombres} ${t.apellidos}.` +
          (data.cuenta_reactivada ? ' Su cuenta de acceso también se reactivó.' : ''),
      )
      cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo reactivar al trabajador.'))
    }
  }

  /**
   * Registra un cargo o una especialidad nueva sin salir del formulario: queda
   * en el catálogo (el administrador lo puede editar después en Catálogo) y de
   * una vez seleccionada en el trabajador que se está registrando.
   */
  const crearCatalogo = async (e) => {
    e.preventDefault()
    setErrorCatalogo('')
    setGuardandoCatalogo(true)
    try {
      const { data } = await api.post(`/catalogos/${nuevoCatalogo}`, {
        nombre: catalogoForm.nombre,
        descripcion: catalogoForm.descripcion,
        ...(nuevoCatalogo === 'cargos' ? { operativo: catalogoForm.operativo } : {}),
      })
      const fila = data[nuevoCatalogo === 'cargos' ? 'cargo' : 'especialidad']
      if (nuevoCatalogo === 'cargos') {
        setCargos((prev) => [...prev, fila].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setForm((f) => ({ ...f, cargo_id: String(fila.id) }))
      } else {
        setEspecialidades((prev) => [...prev, fila].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setForm((f) => ({ ...f, especialidad_id: String(fila.id) }))
      }
      setAviso(`${fila.nombre} agregado al catálogo y seleccionado.`)
      setNuevoCatalogo(null)
      setCatalogoForm({ nombre: '', descripcion: '', operativo: false })
    } catch (err) {
      setErrorCatalogo(mensajeError(err, 'No se pudo registrar en el catálogo.'))
    } finally {
      setGuardandoCatalogo(false)
    }
  }

  const campo = (nombre) => (campoForm === nombre ? 'input border-red-400' : 'input')
  const cargoElegido = cargos.find((c) => String(c.id) === String(form.cargo_id))
  const hayFiltros = Object.values(filtros).some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={cargar} />}
        title="Personal"
        subtitle="Registrar personal con su cargo y especialidad"
      >
        {esAdmin && (
          <button
            className="btn-primary"
            onClick={() => {
              setEditando(null)
              setForm(VACIO)
              setErrorForm('')
              setCampoForm(null)
              setAbierto(true)
            }}
          >
            <PlusIcon className="h-5 w-5" /> Nuevo trabajador
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {/* Búsqueda y filtros (corren en la base por el volumen de personal) */}
      <FiltrosDesplegable
        titulo="Buscar personal"
        ariaLabel="Filtros de personal"
        activos={Object.values(filtros).filter((v) => v !== '').length}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label htmlFor="per-buscar" className="label">
              Búsqueda
            </label>
            <input
              id="per-buscar"
              type="search"
              className="input"
              placeholder="Nombre, documento, correo, cargo o especialidad"
              value={filtros.buscar}
              onChange={(e) => setFiltros((f) => ({ ...f, buscar: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="per-estado" className="label">
              Estado
            </label>
            <select
              id="per-estado"
              className="input"
              value={filtros.estado}
              onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
            >
              <option value="">Todos</option>
              {ESTADOS.map((e2) => (
                <option key={e2.value} value={e2.value}>
                  {e2.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="per-disponible" className="label">
              Disponibilidad
            </label>
            <select
              id="per-disponible"
              className="input"
              value={filtros.disponible}
              onChange={(e) => setFiltros((f) => ({ ...f, disponible: e.target.value }))}
            >
              <option value="">Todas</option>
              <option value="1">Disponibles</option>
              <option value="0">No disponibles</option>
            </select>
          </div>
          <div>
            <label htmlFor="per-cargo" className="label">
              Cargo
            </label>
            <select
              id="per-cargo"
              className="input"
              value={filtros.cargo_id}
              onChange={(e) => setFiltros((f) => ({ ...f, cargo_id: e.target.value }))}
            >
              <option value="">Todos</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-ghost"
              disabled={!hayFiltros}
              onClick={() => setFiltros(SIN_FILTROS)}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
        {personal !== null && (
          <p className="text-xs text-slate-500">
            {personal.length} {personal.length === 1 ? 'trabajador' : 'trabajadores'}{' '}
            {hayFiltros ? 'con los filtros aplicados' : 'en la lista'}
          </p>
        )}
      </FiltrosDesplegable>

      {/* Formulario de registro: en ventana emergente, no al final de la página. */}
      {esAdmin && (
        <Modal
          abierto={abierto}
          titulo={editando ? 'Actualizar información del trabajador' : 'Registrar personal'}
          subtitulo={
            editando
              ? 'El cambio queda registrado en la bitácora de trazabilidad'
              : 'Cargo y especialidad salen del catálogo de la empresa'
          }
          onCerrar={cerrarFormulario}
          ancho="max-w-3xl"
        >
          <form onSubmit={guardar} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="t-doc" className="label">
                  Número de documento
                </label>
                <input
                  id="t-doc"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={20}
                  className={`${campo('numero_documento')} tabular-nums`}
                  value={form.numero_documento}
                  onChange={(e) =>
                    setForm({ ...form, numero_documento: soloDigitos(e.target.value).slice(0, 20) })
                  }
                  disabled={Boolean(editando)}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  {editando
                    ? 'El documento identifica al trabajador y no se edita.'
                    : 'Solo números, sin puntos ni espacios.'}
                </p>
              </div>
              <div>
                <label htmlFor="t-tipo" className="label">
                  Tipo de documento
                </label>
                <select
                  id="t-tipo"
                  className="input"
                  value={form.tipo_documento}
                  onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
                >
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="NIT">NIT</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div>
                <label htmlFor="t-nombres" className="label">
                  Nombres
                </label>
                <input
                  id="t-nombres"
                  maxLength={100}
                  className="input"
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="t-apellidos" className="label">
                  Apellidos
                </label>
                <input
                  id="t-apellidos"
                  maxLength={100}
                  className="input"
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="t-email" className="label">
                  Correo personal
                </label>
                <input
                  id="t-email"
                  maxLength={150}
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@correo.com"
                  className={campo('email')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="t-telefono" className="label">
                  Teléfono
                </label>
                <TelefonoPais
                  id="t-telefono"
                  value={form.telefono}
                  onChange={(v) => setForm({ ...form, telefono: v })}
                  error={campoForm === 'telefono'}
                />
              </div>

              <div>
                <label htmlFor="t-cargo" className="label">
                  Cargo
                </label>
                <select
                  id="t-cargo"
                  className={campo('cargo_id')}
                  value={form.cargo_id}
                  onChange={(e) => {
                    if (e.target.value === '__nuevo__') {
                      setNuevoCatalogo('cargos')
                      setCatalogoForm({ nombre: '', descripcion: '', operativo: false })
                      setErrorCatalogo('')
                      return
                    }
                    setForm({ ...form, cargo_id: e.target.value })
                  }}
                  required
                >
                  <option value="">Seleccione un cargo…</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.operativo ? ' · obra' : ''}
                    </option>
                  ))}
                  {esAdmin && <option value="__nuevo__">+ Registrar un cargo nuevo…</option>}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {cargoElegido
                    ? cargoElegido.operativo
                      ? 'Cargo de obra: la especialidad es obligatoria.'
                      : 'Cargo administrativo: la especialidad es opcional.'
                    : `${cargos.length} cargos en el catálogo de la empresa.`}
                </p>
              </div>
              <div>
                <label htmlFor="t-especialidad" className="label">
                  Especialidad
                </label>
                <select
                  id="t-especialidad"
                  className={campo('especialidad_id')}
                  value={form.especialidad_id}
                  onChange={(e) => {
                    if (e.target.value === '__nuevo__') {
                      setNuevoCatalogo('especialidades')
                      setCatalogoForm({ nombre: '', descripcion: '', operativo: false })
                      setErrorCatalogo('')
                      return
                    }
                    setForm({ ...form, especialidad_id: e.target.value })
                  }}
                >
                  <option value="">Sin especialidad</option>
                  {especialidades.map((e2) => (
                    <option key={e2.id} value={e2.id}>
                      {e2.nombre}
                    </option>
                  ))}
                  {esAdmin && <option value="__nuevo__">+ Registrar una especialidad nueva…</option>}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Obligatoria para los cargos marcados como de obra (maestro de obra, oficial,
                  obrero…).
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="t-direccion" className="label">
                  Dirección
                </label>
                <div className="flex gap-2">
                  <input
                    id="t-direccion"
                    maxLength={255}
                    className="input"
                    placeholder="Escriba la dirección o selecciónela en el mapa"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    onClick={() => setMapaAbierto(true)}
                  >
                    <MapPinIcon className="h-4 w-4" /> Mapa
                  </button>
                </div>
              </div>

              {/* El estado define la disponibilidad; al crear siempre queda Activo. */}
              <div>
                <label htmlFor="t-estado" className="label">
                  Estado
                </label>
                <select
                  id="t-estado"
                  className="input"
                  value={form.estado}
                  disabled={!editando}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {ESTADOS.map((e2) => (
                    <option key={e2.value} value={e2.value}>
                      {e2.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {editando
                    ? 'Al pasar a un estado distinto de Activo, el trabajador deja de estar disponible.'
                    : 'Al registrarlo queda Activo y disponible.'}
                </p>
              </div>
            </div>

            {/* Los errores de negocio se muestran aquí, dentro del formulario. */}
            <AlertaFormulario mensaje={errorForm} campo={campoForm} />

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar trabajador'}
              </button>
              <button type="button" className="btn-ghost" onClick={cerrarFormulario}>
                Cancelar
              </button>
              {/* HU-18: retirar a la persona. Va aparte, pegado a la derecha, y
                  pide confirmación antes de hacer nada. */}
              {editando && (
                <button type="button" className="btn-peligro ml-auto" onClick={pedirBaja}>
                  <span aria-hidden="true">⚠️</span> Dar de baja
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmación de «Dar de baja»: se abre encima del formulario de edición,
          con el mismo estilo que las demás confirmaciones (Roles, Catálogo). */}
      <Modal
        abierto={porDarDeBaja !== null}
        titulo={porDarDeBaja ? `¿Dar de baja a ${porDarDeBaja.nombres} ${porDarDeBaja.apellidos}?` : ''}
        onCerrar={() => !dandoDeBaja && setPorDarDeBaja(null)}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">Al dar de baja a esta persona:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Deja de aparecer en la lista de personal y en la selección de responsables.</li>
          <li>No podrá asignarse a proyectos ni actividades nuevas.</li>
          <li>Si tiene cuenta para entrar al sistema, la cuenta se bloquea y su sesión se cierra.</li>
          <li>No se borra nada: su historial se conserva y se puede reactivar desde «Incluir dados de baja».</li>
        </ul>
        <p className="mt-3 rounded-xl bg-accent-50 px-4 py-3 text-xs text-brand-800 ring-1 ring-accent-200">
          Si es responsable de proyectos o actividades en curso, primero hay que reasignarlos.
        </p>
        {errorBaja && (
          <div className="mt-3">
            <AlertaFormulario mensaje={errorBaja} />
          </div>
        )}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-primary disabled:opacity-60"
            disabled={dandoDeBaja}
            onClick={confirmarBaja}
          >
            {dandoDeBaja ? 'Dando de baja…' : 'Dar de baja'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={dandoDeBaja}
            onClick={() => setPorDarDeBaja(null)}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Alta rápida de un valor del catálogo sin salir del formulario. */}
      <Modal
        abierto={nuevoCatalogo !== null}
        titulo={CATALOGO_TITULO[nuevoCatalogo] ?? ''}
        subtitulo="Queda guardado en el catálogo de la empresa y seleccionado en el formulario"
        onCerrar={() => {
          setNuevoCatalogo(null)
          setErrorCatalogo('')
        }}
      >
        <form onSubmit={crearCatalogo} className="space-y-4">
          <div>
            <label htmlFor="cat-nombre" className="label">
              Nombre
            </label>
            <input
              id="cat-nombre"
              maxLength={100}
              className="input"
              value={catalogoForm.nombre}
              required
              minLength={3}
              onChange={(e) => setCatalogoForm({ ...catalogoForm, nombre: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="cat-descripcion" className="label">
              Descripción
            </label>
            <input
              id="cat-descripcion"
              maxLength={255}
              className="input"
              value={catalogoForm.descripcion}
              onChange={(e) => setCatalogoForm({ ...catalogoForm, descripcion: e.target.value })}
            />
          </div>
          {nuevoCatalogo === 'cargos' && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                checked={catalogoForm.operativo}
                onChange={(e) => setCatalogoForm({ ...catalogoForm, operativo: e.target.checked })}
              />
              <span>
                Es cargo de obra
                <span className="block text-xs text-slate-500">
                  Para estos cargos la especialidad es obligatoria.
                </span>
              </span>
            </label>
          )}

          <AlertaFormulario mensaje={errorCatalogo} />

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button type="submit" disabled={guardandoCatalogo} className="btn-primary disabled:opacity-60">
              {guardandoCatalogo ? 'Guardando…' : 'Agregar al catálogo'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setNuevoCatalogo(null)}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Mapa para la dirección: devuelve el texto normalizado al formulario. */}
      <SelectorUbicacion
        abierto={mapaAbierto}
        valorInicial={form.direccion}
        onCerrar={() => setMapaAbierto(false)}
        onAceptar={(texto) => {
          setForm((f) => ({ ...f, direccion: texto }))
          setMapaAbierto(false)
        }}
      />

      {personal === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando personal…
        </div>
      )}

      {personal !== null && personal.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <UsersIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            {hayFiltros ? 'Ningún trabajador coincide con la búsqueda' : 'Aún no hay personal registrado'}
          </p>
          {hayFiltros && (
            <p className="text-xs text-slate-500">Ajuste o limpie los filtros para ver más.</p>
          )}
        </div>
      )}

      {personal !== null && personal.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm md:min-w-[860px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold md:px-5 md:py-3.5">Trabajador</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Documento</th>
                  <th className="px-3 py-3 font-semibold md:px-5 md:py-3.5">Cargo</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Contacto</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Estado</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Disponibilidad</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Acciones</th>
                  <EncabezadoFicha />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {personal.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-50/70">
                    <td className="px-3 py-3 font-medium text-slate-800 md:px-5 md:py-4">
                      {t.nombres} {t.apellidos}
                      {!t.activo && (
                        <span className="badge ml-2 bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                          Dado de baja
                        </span>
                      )}
                      {t.especialidad && (
                        <p className="text-xs font-normal text-slate-400">{t.especialidad}</p>
                      )}
                    </td>
                    <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                      {t.tipo_documento} {t.numero_documento}
                    </td>
                    <td className="px-3 py-3 text-slate-600 md:px-5 md:py-4">{t.cargo}</td>
                    <td className="hidden px-5 py-4 text-xs text-slate-500 md:table-cell">
                      {t.email ?? '—'}
                      {t.telefono && <p className="tabular-nums">{telefonoLegible(t.telefono)}</p>}
                      {t.direccion && (
                        <p className="max-w-[180px] truncate" title={t.direccion}>
                          {t.direccion}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-5 py-4 md:table-cell">
                      {!t.activo ? (
                        <div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_BADGE.INACTIVO}`}>
                            Inactivo
                          </span>
                          {t.fecha_baja && (
                            <p className="mt-1 text-xs text-slate-400">De baja desde {fmtFecha(t.fecha_baja)}</p>
                          )}
                        </div>
                      ) : esAdmin ? (
                        <select
                          className="input py-1 text-xs"
                          aria-label={`Estado de ${t.nombres} ${t.apellidos}`}
                          value={t.estado}
                          onChange={(e) => cambiarEstado(t, e.target.value)}
                        >
                          {ESTADOS.map((e2) => (
                            <option key={e2.value} value={e2.value}>
                              {e2.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ESTADO_BADGE[t.estado] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.estado}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                      {Number(t.disponible) ? 'Disponible' : 'No disponible'}
                    </td>
                    <td className="hidden px-5 py-4 md:table-cell">
                      {/* En escritorio las acciones se apilan en vertical: en
                          horizontal se montaban unas sobre otras. */}
                      <div className="flex flex-col items-stretch gap-1.5">
                        {/* Un registro dado de baja es historial: no se edita,
                            solo se reactiva. */}
                        {esAdmin && Boolean(t.activo) && (
                          <button
                            className="btn-accion btn-accion-editar"
                            onClick={() => abrirEditar(t)}
                            aria-label={`Actualizar información de ${t.nombres}`}
                          >
                            <PencilSquareIcon className="h-4 w-4" /> Editar
                          </button>
                        )}
                        {esAdmin && !t.activo && (
                          <button
                            className="btn-accion btn-accion-ok"
                            onClick={() => reactivar(t)}
                            aria-label={`Reactivar a ${t.nombres} ${t.apellidos}`}
                          >
                            <ArrowUturnLeftIcon className="h-4 w-4" /> Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                    <CeldaFicha onClick={() => setFicha(t)} etiqueta={`${t.nombres} ${t.apellidos}`} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ficha && (
        <Ficha
          abierto
          titulo={`${ficha.nombres} ${ficha.apellidos}`}
          subtitulo={ficha.cargo}
          onCerrar={() => setFicha(null)}
          campos={[
            ['Documento', `${ficha.tipo_documento} ${ficha.numero_documento}`],
            ['Cargo', ficha.cargo],
            ['Especialidad', ficha.especialidad],
            ['Correo', ficha.email],
            ['Teléfono', ficha.telefono ? telefonoLegible(ficha.telefono) : null],
            ['Dirección', ficha.direccion],
            [
              'Estado',
              ficha.activo
                ? ficha.estado
                : `Inactivo · de baja${ficha.fecha_baja ? ` desde ${fmtFecha(ficha.fecha_baja)}` : ''}`,
            ],
            ['Disponibilidad', Number(ficha.disponible) ? 'Disponible' : 'No disponible'],
          ]}
        >
          {esAdmin && ficha.activo && (
            <div className="w-full">
              <label htmlFor="ficha-estado" className="label">
                Cambiar estado
              </label>
              <select
                id="ficha-estado"
                className="input"
                value={ficha.estado}
                onChange={(e) => {
                  const t = ficha
                  setFicha(null)
                  cambiarEstado(t, e.target.value)
                }}
              >
                {ESTADOS.map((e2) => (
                  <option key={e2.value} value={e2.value}>
                    {e2.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {esAdmin && Boolean(ficha.activo) && (
            <button
              type="button"
              className="btn-accion btn-accion-editar"
              onClick={() => {
                const t = ficha
                setFicha(null)
                abrirEditar(t)
              }}
            >
              <PencilSquareIcon className="h-4 w-4" /> Editar
            </button>
          )}
          {esAdmin && !ficha.activo && (
            <button
              type="button"
              className="btn-accion btn-accion-ok"
              onClick={() => {
                const t = ficha
                setFicha(null)
                reactivar(t)
              }}
            >
              <ArrowUturnLeftIcon className="h-4 w-4" /> Reactivar
            </button>
          )}
        </Ficha>
      )}
    </div>
  )
}
