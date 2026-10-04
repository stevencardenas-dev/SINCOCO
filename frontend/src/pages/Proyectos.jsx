import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  FolderIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import Ficha, { CeldaFicha, EncabezadoFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
import SelectorUbicacion from '../components/SelectorUbicacion.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'
import { campoError, mensajeError } from '../lib/errores.js'
import {
  estadoProyecto,
  fmtCOP,
  fmtFecha,
  fmtMiles,
  montoEnPalabras,
  soloDigitos,
} from '../lib/format.js'

/**
 * Módulo de proyectos (RF02 · HU-02).
 *
 * El listado admite búsqueda y filtros que corren en la base (no en el
 * navegador): con el volumen de proyectos, `buscar` cruza nombre, código,
 * cliente, ubicación y responsable, y `estado` filtra por la etapa del ciclo de
 * vida. CU-02 (registrar proyecto) valida en el backend; sus mensajes se
 * muestran DENTRO del formulario, nunca sobre la tabla.
 */

const VACIO = {
  codigo: '',
  nombre: '',
  cliente_id: '',
  responsable_id: '',
  ubicacion: '',
  presupuesto_inicial: '',
  fecha_inicio_programada: '',
  fecha_fin_programada: '',
  descripcion: '',
  observaciones: '',
}

const CLIENTE_VACIO = {
  numero_documento: '',
  tipo_documento: 'NIT',
  razon_social_nombre: '',
  nombre_contacto: '',
  telefono: '',
}

const SIN_FILTROS = { buscar: '', estado: '' }

// presupuesto_inicial es decimal(15,2): 13 dígitos enteros como máximo.
const MAX_DIGITOS_PRESUPUESTO = 13

const ESTADOS = [
  { value: 'PLANIFICACION', label: 'Planificación' },
  { value: 'EN_EJECUCION', label: 'En ejecución' },
  { value: 'PAUSADO', label: 'Pausado' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

export default function Proyectos() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'ADMINISTRADOR'

  // El buscador de la barra superior navega a /proyectos?buscar=…
  const [parametros] = useSearchParams()

  const [proyectos, setProyectos] = useState(null)
  const [clientes, setClientes] = useState([])
  const [responsables, setResponsables] = useState([])
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState('')
  const [filtros, setFiltros] = useState(() => ({
    ...SIN_FILTROS,
    buscar: parametros.get('buscar') ?? '',
  }))
  const [form, setForm] = useState(VACIO)
  const [abierto, setAbierto] = useState(false)
  // Selector de ubicación en el mapa (Leaflet), abierto desde el formulario.
  const [mapaAbierto, setMapaAbierto] = useState(false)
  // Proyecto en edición: null = el formulario está registrando uno nuevo.
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [clienteAbierto, setClienteAbierto] = useState(false)
  const [clienteForm, setClienteForm] = useState(CLIENTE_VACIO)
  // Errores propios del formulario: se muestran dentro del modal, no en la raíz.
  const [errorForm, setErrorForm] = useState('')
  const [campoForm, setCampoForm] = useState(null)
  const [errorCliente, setErrorCliente] = useState('')
  // HU-18: por defecto no se muestran los proyectos dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  // Celular: la tabla conserva pocas columnas y el resto va en la ficha.
  const [ficha, setFicha] = useState(null)

  const presupuestoNumero = Number(soloDigitos(form.presupuesto_inicial) || 0)

  const cargar = () => {
    setError(null)
    return api
      .get('/proyectos', {
        params: {
          ...(incluirInactivos ? { incluirInactivos: 1 } : {}),
          ...(filtros.buscar ? { buscar: filtros.buscar } : {}),
          ...(filtros.estado ? { estado: filtros.estado } : {}),
        },
      })
      .then((res) => setProyectos(res.data))
      .catch(() =>
        setError('No se pudieron cargar los proyectos. Verifique que el backend esté disponible.'),
      )
  }

  const cargarCatalogos = () => {
    if (!esAdmin) return
    // El responsable es un trabajador activo (HU-04), no un usuario del sistema.
    api.get('/clientes').then((res) => setClientes(res.data)).catch(() => {})
    api.get('/trabajadores').then((res) => setResponsables(res.data)).catch(() => {})
  }

  useEffect(() => {
    cargar()
  }, [incluirInactivos, filtros])
  useEffect(cargarCatalogos, [esAdmin])

  // La búsqueda de la barra superior puede cambiar estando ya en esta pantalla.
  useEffect(() => {
    const buscar = parametros.get('buscar')
    if (buscar !== null) setFiltros((f) => ({ ...f, buscar }))
  }, [parametros])

  const cambiarFiltro = (campo, valor) => setFiltros((prev) => ({ ...prev, [campo]: valor }))

  // HU-18: baja lógica y reactivación de proyectos (nunca borrado físico).
  const cambiarBaja = async (p) => {
    setError(null)
    setAviso('')
    try {
      await api.patch(`/proyectos/${p.id}/${p.activo ? 'baja' : 'reactivar'}`)
      setAviso(`${p.nombre}: ${p.activo ? 'dado de baja' : 'reactivado'}.`)
      cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cambiar el estado del proyecto.'))
    }
  }

  // CU-02: registrar un proyecto nuevo o actualizar el que se está editando.
  const guardar = async (e) => {
    e.preventDefault()
    setErrorForm('')
    setCampoForm(null)
    setGuardando(true)
    try {
      const cuerpo = {
        ...form,
        cliente_id: Number(form.cliente_id),
        responsable_id: Number(form.responsable_id),
        presupuesto_inicial: Number(soloDigitos(form.presupuesto_inicial) || 0),
      }
      const { data } = editando
        ? await api.patch(`/proyectos/${editando}`, cuerpo)
        : await api.post('/proyectos', cuerpo)
      const nombre = data.proyecto?.nombre ?? form.nombre
      setAviso(editando ? `Proyecto "${nombre}" actualizado.` : `Proyecto "${nombre}" registrado en planificación.`)
      cerrarFormulario()
      cargar()
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo guardar el proyecto.'))
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

  /** Pasa el proyecto a edición: el formulario se abre con sus datos actuales. */
  const abrirEditar = (p) => {
    setAviso('')
    setErrorForm('')
    setCampoForm(null)
    setEditando(p.id)
    setForm({
      codigo: p.codigo ?? '',
      nombre: p.nombre ?? '',
      cliente_id: String(p.cliente_id ?? ''),
      responsable_id: String(p.responsable_id ?? ''),
      ubicacion: p.ubicacion ?? '',
      // El presupuesto llega como decimal ('1250000000.00'): se pasa a dígitos.
      presupuesto_inicial: String(Math.round(Number(p.presupuesto_inicial ?? 0))),
      fecha_inicio_programada: String(p.fecha_inicio_programada ?? '').slice(0, 10),
      fecha_fin_programada: String(p.fecha_fin_programada ?? '').slice(0, 10),
      descripcion: p.descripcion ?? '',
      observaciones: p.observaciones ?? '',
    })
    setAbierto(true)
  }

  // CU-02 Alt 2: el cliente no existe -> se registra aquí y queda seleccionado.
  const crearCliente = async (e) => {
    e.preventDefault()
    setErrorCliente('')
    try {
      const { data } = await api.post('/clientes', clienteForm)
      setClientes((prev) =>
        [...prev, data.cliente].sort((a, b) =>
          a.razon_social_nombre.localeCompare(b.razon_social_nombre),
        ),
      )
      setForm((f) => ({ ...f, cliente_id: String(data.cliente.id) }))
      setClienteForm(CLIENTE_VACIO)
      setClienteAbierto(false)
      setAviso(`Cliente "${data.cliente.razon_social_nombre}" registrado y seleccionado.`)
    } catch (err) {
      setErrorCliente(mensajeError(err, 'No se pudo registrar el cliente.'))
    }
  }

  const campo = (nombre) => (campoForm === nombre ? 'input border-red-400' : 'input')
  const hayFiltros = Boolean(filtros.buscar || filtros.estado)
  // El backend limita el listado al alcance del rol (RBAC): estos roles ven
  // todos los proyectos; los demás, solo los asignados.
  const veTodos = ['ADMINISTRADOR', 'GERENTE'].includes(user?.rol)

  const opcionesClientes = clientes.map((c) => ({
    value: c.id,
    label: c.razon_social_nombre,
    sublabel: `${c.tipo_documento} ${c.numero_documento}`,
  }))

  const opcionesResponsables = responsables.map((t) => ({
    value: t.id,
    label: `${t.nombres} ${t.apellidos}`,
    sublabel: [t.cargo, t.especialidad, t.numero_documento].filter(Boolean).join(' · '),
  }))

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={cargar} />}
        title="Proyectos"
        subtitle="Registro, etapas, actividades y seguimiento de avance"
      >
        {esAdmin && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditando(null)
              setForm(VACIO)
              setErrorForm('')
              setCampoForm(null)
              setAbierto(true)
            }}
          >
            <PlusIcon className="h-5 w-5" /> Nuevo proyecto
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {/* Búsqueda y filtros del listado (corren en la base) */}
      <FiltrosDesplegable
        titulo="Buscar proyectos"
        ariaLabel="Filtros de proyectos"
        activos={[filtros.buscar, filtros.estado].filter(Boolean).length}
        abiertoInicial={Boolean(filtros.buscar)}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label htmlFor="prj-buscar" className="label">
              Búsqueda
            </label>
            <input
              id="prj-buscar"
              type="search"
              className="input"
              placeholder="Nombre, código, cliente, ubicación o responsable"
              value={filtros.buscar}
              onChange={(e) => cambiarFiltro('buscar', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="prj-estado" className="label">
              Estado
            </label>
            <select
              id="prj-estado"
              className="input"
              value={filtros.estado}
              onChange={(e) => cambiarFiltro('estado', e.target.value)}
            >
              <option value="">Todos</option>
              {ESTADOS.map((e2) => (
                <option key={e2.value} value={e2.value}>
                  {e2.label}
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
        {proyectos !== null && (
          <p className="text-xs text-slate-500">
            {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'}{' '}
            {hayFiltros ? 'con los filtros aplicados' : 'en la lista'}
            {!veTodos &&
              ' · solo se listan los proyectos donde está asignado o de los que es responsable'}
          </p>
        )}
      </FiltrosDesplegable>

      {esAdmin && (
        <Modal
          abierto={abierto}
          titulo={editando ? 'Actualizar proyecto' : 'Registrar proyecto'}
          subtitulo={
            editando
              ? `Código ${form.codigo} · el cambio queda en la bitácora`
              : 'Queda en estado de planificación'
          }
          onCerrar={cerrarFormulario}
          ancho="max-w-3xl"
        >
          <form onSubmit={guardar} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="p-codigo" className="label">
                  Código
                </label>
                <input
                  id="p-codigo"
                  maxLength={20}
                  className={campo('codigo')}
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  disabled={Boolean(editando)}
                  required
                />
                {editando && (
                  <p className="mt-1 text-xs text-slate-500">
                    El código identifica el proyecto y no se edita.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="p-nombre" className="label">
                  Nombre
                </label>
                <input
                  id="p-nombre"
                  maxLength={150}
                  className={campo('nombre')}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="p-cliente" className="label">
                  Cliente
                </label>
                {/* Combobox con búsqueda: la lista de clientes crece. */}
                <BuscadorSelect
                  id="p-cliente"
                  value={form.cliente_id}
                  onChange={(v) => setForm({ ...form, cliente_id: v })}
                  opciones={opcionesClientes}
                  placeholder="Escriba el nombre del cliente…"
                  error={campoForm === 'cliente_id'}
                  requerido
                />
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-brand-700 hover:underline"
                  onClick={() => setClienteAbierto((v) => !v)}
                >
                  <BuildingOffice2Icon className="mr-1 inline h-4 w-4" />
                  El cliente no está en la lista: registrarlo
                </button>
              </div>
              <div>
                <label htmlFor="p-responsable" className="label">
                  Responsable
                </label>
                <BuscadorSelect
                  id="p-responsable"
                  value={form.responsable_id}
                  onChange={(v) => setForm({ ...form, responsable_id: v })}
                  opciones={opcionesResponsables}
                  placeholder="Escriba el nombre del responsable…"
                  error={campoForm === 'responsable_id'}
                  requerido
                />
              </div>

              <div>
                <label htmlFor="p-inicio" className="label">
                  Inicio programado
                </label>
                <input
                  id="p-inicio"
                  type="date"
                  className={campo('fecha_inicio_programada')}
                  value={form.fecha_inicio_programada}
                  onChange={(e) => setForm({ ...form, fecha_inicio_programada: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="p-fin" className="label">
                  Fin programado
                </label>
                <input
                  id="p-fin"
                  type="date"
                  className={campo('fecha_fin_programada')}
                  value={form.fecha_fin_programada}
                  onChange={(e) => setForm({ ...form, fecha_fin_programada: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="p-ubicacion" className="label">
                  Ubicación
                </label>
                <div className="flex gap-2">
                  <input
                    id="p-ubicacion"
                    maxLength={255}
                    className={campo('ubicacion')}
                    placeholder="Escriba la dirección o selecciónela en el mapa"
                    value={form.ubicacion}
                    onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                    required
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
              <div>
                <label htmlFor="p-presupuesto" className="label">
                  Presupuesto inicial (COP)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    $
                  </span>
                  <input
                    id="p-presupuesto"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="850.000.000"
                    className={`${campo('presupuesto_inicial')} pl-8 tabular-nums`}
                    value={fmtMiles(form.presupuesto_inicial)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        presupuesto_inicial: soloDigitos(e.target.value).slice(
                          0,
                          MAX_DIGITOS_PRESUPUESTO,
                        ),
                      })
                    }
                    required
                  />
                </div>
                <p
                  className={`mt-1 text-xs ${
                    form.presupuesto_inicial && presupuestoNumero <= 0
                      ? 'font-medium text-red-600'
                      : 'text-slate-500'
                  }`}
                >
                  {presupuestoNumero > 0
                    ? `${fmtCOP(presupuestoNumero)} · ${montoEnPalabras(form.presupuesto_inicial)}`
                    : form.presupuesto_inicial
                      ? 'El presupuesto debe ser mayor que cero.'
                      : 'Escriba el monto en pesos, sin puntos: se separan solos.'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="p-descripcion" className="label">
                  Descripción
                </label>
                <textarea
                  id="p-descripcion"
                  maxLength={5000}
                  className="input"
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>
            </div>

            {/* El error de negocio se muestra aquí, dentro del formulario. */}
            <AlertaFormulario mensaje={errorForm} campo={campoForm} />

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar proyecto'}
              </button>
              <button type="button" className="btn-ghost" onClick={cerrarFormulario}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Mapa para la ubicación: devuelve el texto normalizado al formulario. */}
      <SelectorUbicacion
        abierto={mapaAbierto}
        valorInicial={form.ubicacion}
        onCerrar={() => setMapaAbierto(false)}
        onAceptar={(texto) => {
          setForm((f) => ({ ...f, ubicacion: texto }))
          setMapaAbierto(false)
        }}
      />

      {/* CU-02 Alt 2: alta rápida del cliente dentro de su propia ventana. */}
      {esAdmin && (
        <Modal
          abierto={clienteAbierto}
          titulo="Registrar cliente"
          subtitulo="Queda guardado en el catálogo y seleccionado en el proyecto"
          onCerrar={() => {
            setClienteAbierto(false)
            setErrorCliente('')
          }}
        >
          <form onSubmit={crearCliente} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-tipo" className="label">
                  Tipo de documento
                </label>
                <select
                  id="c-tipo"
                  className="input"
                  value={clienteForm.tipo_documento}
                  onChange={(e) => setClienteForm({ ...clienteForm, tipo_documento: e.target.value })}
                >
                  <option value="NIT">NIT</option>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div>
                <label htmlFor="c-doc" className="label">
                  Documento
                </label>
                <input
                  id="c-doc"
                  maxLength={20}
                  className="input"
                  value={clienteForm.numero_documento}
                  onChange={(e) => setClienteForm({ ...clienteForm, numero_documento: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="c-nombre" className="label">
                Razón social / nombre
              </label>
              <input
                id="c-nombre"
                maxLength={150}
                className="input"
                value={clienteForm.razon_social_nombre}
                onChange={(e) => setClienteForm({ ...clienteForm, razon_social_nombre: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-contacto" className="label">
                  Nombre del contacto
                </label>
                <input
                  id="c-contacto"
                  maxLength={100}
                  className="input"
                  value={clienteForm.nombre_contacto}
                  onChange={(e) => setClienteForm({ ...clienteForm, nombre_contacto: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="c-telefono" className="label">
                  Teléfono
                </label>
                <input
                  id="c-telefono"
                  maxLength={20}
                  className="input"
                  value={clienteForm.telefono}
                  onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })}
                />
              </div>
            </div>

            <AlertaFormulario mensaje={errorCliente} />

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button type="submit" className="btn-primary">
                Registrar cliente
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setClienteAbierto(false)
                  setErrorCliente('')
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {proyectos === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando proyectos…
        </div>
      )}

      {proyectos !== null && proyectos.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <FolderIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            {hayFiltros ? 'Ningún proyecto coincide con la búsqueda' : 'Aún no hay proyectos'}
          </p>
          <p className="text-xs text-slate-500">
            {hayFiltros
              ? 'Ajuste o limpie los filtros para ver más resultados.'
              : esAdmin
                ? 'Registre el primer proyecto con el botón «Nuevo proyecto».'
                : 'El administrador todavía no ha registrado proyectos.'}
          </p>
        </div>
      )}

      {proyectos !== null && proyectos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm md:min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold md:px-5 md:py-3.5">Proyecto</th>
                  <th className="px-3 py-3 font-semibold md:px-5 md:py-3.5">Responsable</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Ubicación</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Presupuesto</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Estado</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Avance</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Plan</th>
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Acciones</th>
                  <EncabezadoFicha />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proyectos.map((p) => {
                  const est = estadoProyecto[p.estado?.toLowerCase()] ?? estadoProyecto.planificacion
                  const avance = Number(p.porcentaje_avance_total)
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/70">
                      <td className="px-3 py-3 md:px-5 md:py-4">
                        <p className="font-semibold text-slate-900">{p.nombre}</p>
                        <p className="text-xs text-slate-400">
                          {p.codigo} · {p.cliente_nombre} · {fmtFecha(p.fecha_inicio_programada)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-600 md:px-5 md:py-4">{p.responsable_nombre}</td>
                      <td className="hidden max-w-[14rem] px-5 py-4 text-slate-600 md:table-cell">
                        <span className="block truncate" title={p.ubicacion}>
                          {p.ubicacion}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 font-medium tabular-nums text-slate-700 md:table-cell">
                        {fmtCOP(Number(p.presupuesto_inicial))}
                      </td>
                      <td className="hidden px-5 py-4 md:table-cell">
                        <span className={`badge ring-1 ${est.cls}`}>{est.label}</span>
                      </td>
                      <td className="hidden px-5 py-4 md:table-cell">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-brand-100">
                            <div
                              className="h-full rounded-full bg-accent-500 transition-all"
                              style={{ width: `${avance}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-slate-600">
                            {avance}%
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 md:table-cell">
                        <Link to={`/proyectos/${p.id}`} className="btn-ghost text-xs">
                          <ClipboardDocumentListIcon className="h-4 w-4" /> Plan
                        </Link>
                      </td>
                      <td className="hidden px-5 py-4 md:table-cell">
                        {/* En escritorio las acciones se apilan en vertical: en
                            horizontal se montaban unas sobre otras. */}
                        <div className="flex flex-col items-stretch gap-1.5">
                          {esAdmin && p.activo && (
                            <button
                              className="btn-accion btn-accion-editar"
                              onClick={() => abrirEditar(p)}
                              aria-label={`Actualizar ${p.nombre}`}
                            >
                              <PencilSquareIcon className="h-4 w-4" /> Editar
                            </button>
                          )}
                          {esAdmin && (
                            <button
                              className={`btn-accion ${p.activo ? 'btn-accion-peligro' : 'btn-accion-ok'}`}
                              onClick={() => cambiarBaja(p)}
                              aria-label={p.activo ? `Dar de baja ${p.nombre}` : `Reactivar ${p.nombre}`}
                            >
                              {p.activo ? 'Dar de baja' : 'Reactivar'}
                            </button>
                          )}
                        </div>
                      </td>
                      <CeldaFicha onClick={() => setFicha(p)} etiqueta={p.nombre} />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ficha && (
        <Ficha
          abierto
          titulo={ficha.nombre}
          subtitulo={ficha.codigo}
          onCerrar={() => setFicha(null)}
          campos={[
            ['Cliente', ficha.cliente_nombre],
            ['Responsable', ficha.responsable_nombre],
            ['Ubicación', ficha.ubicacion],
            ['Presupuesto', fmtCOP(Number(ficha.presupuesto_inicial))],
            ['Estado', (estadoProyecto[ficha.estado?.toLowerCase()] ?? estadoProyecto.planificacion).label],
            ['Avance', `${Number(ficha.porcentaje_avance_total)}%`],
            ['Inicio', fmtFecha(ficha.fecha_inicio_programada)],
            ['Fin', fmtFecha(ficha.fecha_fin_programada)],
          ]}
        >
          <Link to={`/proyectos/${ficha.id}`} className="btn-ghost text-xs">
            <ClipboardDocumentListIcon className="h-4 w-4" /> Plan
          </Link>
          {esAdmin && ficha.activo && (
            <button
              type="button"
              className="btn-accion btn-accion-editar"
              onClick={() => {
                const p = ficha
                setFicha(null)
                abrirEditar(p)
              }}
            >
              <PencilSquareIcon className="h-4 w-4" /> Editar
            </button>
          )}
          {esAdmin && (
            <button
              type="button"
              className={`btn-accion ${ficha.activo ? 'btn-accion-peligro' : 'btn-accion-ok'}`}
              onClick={() => {
                const p = ficha
                setFicha(null)
                cambiarBaja(p)
              }}
            >
              {ficha.activo ? 'Dar de baja' : 'Reactivar'}
            </button>
          )}
        </Ficha>
      )}

      <p className="text-xs text-slate-400">
        El avance del proyecto se deriva de sus actividades según la regla de cálculo definida por la
        empresa. Las etapas y actividades con responsables y fechas se administran desde el plan de
        cada proyecto.
      </p>
    </div>
  )
}
