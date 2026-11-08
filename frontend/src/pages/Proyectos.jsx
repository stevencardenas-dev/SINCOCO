import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowPathIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  FlagIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import { Interruptor } from '../components/FiltrosControles.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
import SelectorUbicacion from '../components/SelectorUbicacion.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { proyectosApi } from '../services/proyectos'
import { clientesApi } from '../services/clientes'
import { trabajadoresApi } from '../services/trabajadores'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'

/**
 * Tarjeta de proyecto. Toda la tarjeta es clicable (abre el menú de acciones: plan, editar…);
 * el responsable y el cliente son enlaces a su ficha, que se abre en otra pestaña.
 */
function TarjetaProyecto({ p, onAbrir, enlaceResponsable, enlaceCliente }) {
  const est = estadoProyecto[p.estado?.toLowerCase()] ?? estadoProyecto.planificacion
  const avance = Math.max(0, Math.min(100, Number(p.porcentaje_avance_total) || 0))
  const cerrado = ['FINALIZADO', 'CANCELADO'].includes(p.estado)
  const atrasado = !cerrado && p.fecha_fin_programada && new Date(String(p.fecha_fin_programada).slice(0, 10)) < new Date(new Date().toDateString())
  const enlace = 'underline decoration-slate-300 underline-offset-2 transition hover:text-brand-700 hover:decoration-brand-600'
  const nuevaPestana = (href, texto) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className={enlace}
      title="Abrir la ficha en una pestaña nueva"
    >
      {texto}
    </a>
  )
  const datos = [
    [UserIcon, 'Responsable', p.responsable_nombre, { enlace: enlaceResponsable && p.responsable_id ? `${enlaceResponsable}${p.responsable_id}` : null }],
    [BanknotesIcon, 'Presupuesto', fmtCOP(Number(p.presupuesto_inicial))],
    [CalendarDaysIcon, 'Fecha de inicio', fmtFecha(p.fecha_inicio_programada)],
    [FlagIcon, 'Fecha de fin', fmtFecha(p.fecha_fin_programada), { alerta: atrasado }],
    [MapPinIcon, 'Ubicación', p.ubicacion, { ancho: true }],
  ]
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(p)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAbrir(p)
        }
      }}
      aria-label={`${p.nombre}: abrir plan`}
      className={`card flex cursor-pointer flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${p.activo ? '' : 'opacity-60'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-wide text-slate-400">{p.codigo}</span>
        {p.activo ? (
          <span className={`badge ring-1 ${est.cls}`}>{est.label}</span>
        ) : (
          <span className="badge bg-slate-100 text-slate-500 ring-1 ring-slate-200">Dado de baja</span>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-bold leading-snug text-slate-900">{p.nombre}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <BuildingOffice2Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {enlaceCliente && p.cliente_id ? nuevaPestana(`${enlaceCliente}${p.cliente_id}`, p.cliente_nombre) : p.cliente_nombre}
          </span>
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Avance</span>
          <span className="font-bold tabular-nums text-slate-700">{avance}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${avance}%` }} />
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-slate-700">
        {datos.map(([Icono, rotulo, valor, op = {}]) =>
          valor ? (
            <li key={rotulo} className={`flex min-w-0 items-start gap-1.5 ${op.ancho ? 'col-span-2' : ''}`} title={rotulo}>
              <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${op.alerta ? 'text-red-500' : 'text-brand-600'}`} aria-label={rotulo} />
              <span className={`min-w-0 text-[13px] ${op.alerta ? 'font-semibold text-red-600' : ''} ${op.ancho ? 'line-clamp-2' : 'truncate'}`}>
                {op.enlace ? nuevaPestana(op.enlace, valor) : valor}
                {op.alerta && ' · atrasado'}
              </span>
            </li>
          ) : null,
        )}
      </ul>
    </article>
  )
}

/** Ubicación recortada en la tabla, con botón para copiarla completa. */
function UbicacionCopiable({ texto }) {
  const [copiado, setCopiado] = useState(false)
  if (!texto) return null

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      /* sin permiso de portapapeles: no hay nada que hacer */
    }
  }

  return (
    <span className="absolute inset-x-5 inset-y-0 flex items-center gap-1 overflow-hidden">
      <span className="line-clamp-4 min-w-0 whitespace-normal break-words" title={texto}>
        {texto}
      </span>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        title={copiado ? 'Copiado' : 'Copiar ubicación'}
        aria-label="Copiar ubicación"
      >
        {copiado ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
      </button>
    </span>
  )
}
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
  const { puede, user } = useAuth()
  // La interfaz sigue la matriz de permisos, no el nombre del rol.
  const puedeCrear = puede('proyectos.registrar')
  const puedeEditar = puede('proyectos.editar')
  const puedeBaja = puede('proyectos.dar_baja')
  const puedeCrearCliente = puede('clientes.crear')
  const gestionaProyectos = puedeCrear || puedeEditar

  // El buscador de la barra superior navega a /proyectos?buscar=…
  const [parametros] = useSearchParams()
  // Menú de acciones de la tarjeta elegida y confirmación de «Dar de baja» (desde Editar).
  const [menu, setMenu] = useState(null)
  const navegar = useNavigate()
  // /proyectos?editar=ID[&volver=plan]: abre la edición desde el plan y, al cerrar, regresa a él.
  const editarPedido = useRef(parametros.get('editar'))
  const volverAlPlan = useRef(parametros.get('volver') ? parametros.get('editar') : null)
  const [porDarDeBaja, setPorDarDeBaja] = useState(null)
  // Enlaces a la ficha del responsable y del cliente, según lo que el usuario puede ver.
  const enlaceResponsable = ['ADMINISTRADOR', 'GERENTE'].includes(user?.rol) ? '/personal?ficha=' : null
  const enlaceCliente = puede('catalogos.listar') ? '/catalogo?tab=clientes&ficha=' : null

  const [clientes, setClientes] = useState([])
  const [responsables, setResponsables] = useState([])
  const {
    filtros,
    cambiar: cambiarFiltro,
    limpiar: limpiarFiltros,
    activos: filtrosActivos,
    hayFiltros,
  } = useFiltros(SIN_FILTROS, { inicial: { ...SIN_FILTROS, buscar: parametros.get('buscar') ?? '' } })
  // Selector de ubicación en el mapa (Leaflet), abierto desde el formulario.
  const [mapaAbierto, setMapaAbierto] = useState(false)
  // HU-18: por defecto no se muestran los proyectos dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem('proyectos-vista') === 'tabla' ? 'tabla' : 'tarjetas' } catch { return 'tarjetas' }
  })
  const cambiarVista = (v) => {
    setVista(v)
    try { localStorage.setItem('proyectos-vista', v) } catch { /* sin storage */ }
  }

  const { datos: proyectos, error, aviso, setAviso, recargar, ejecutar } = useRecurso(
    () => proyectosApi.listar({ incluirInactivos, buscar: filtros.buscar, estado: filtros.estado }),
    [incluirInactivos, filtros],
    { mensaje: 'No se pudieron cargar los proyectos. Verifique que el backend esté disponible.' },
  )

  // Criterio 3 de HU-02: el inicio debe ser estrictamente anterior al fin.
  const fechasInvertidas = (f) =>
    Boolean(f.fecha_inicio_programada && f.fecha_fin_programada && f.fecha_inicio_programada >= f.fecha_fin_programada)

  // CU-02: registrar un proyecto nuevo o actualizar el que se está editando
  // (`registro` es el proyecto en edición; null = nuevo). Los errores se
  // muestran dentro del modal, no en la raíz.
  const formulario = useFormulario(VACIO, {
    validar: (f) =>
      fechasInvertidas(f) && { error: 'La fecha de fin debe ser posterior a la de inicio.', campo: 'fecha_fin_programada' },
    enviar: (f, proyecto) => {
      const cuerpo = {
        ...f,
        cliente_id: Number(f.cliente_id),
        responsable_id: Number(f.responsable_id),
        presupuesto_inicial: Number(soloDigitos(f.presupuesto_inicial) || 0),
      }
      return proyecto ? proyectosApi.actualizar(proyecto.id, cuerpo) : proyectosApi.crear(cuerpo)
    },
    alGuardar: (data, { valores, registro }) => {
      const nombre = data.proyecto?.nombre ?? valores.nombre
      setAviso(registro ? `Proyecto "${nombre}" actualizado.` : `Proyecto "${nombre}" registrado en planificación.`)
      if (volverAlPlan.current) navegar(`/proyectos/${volverAlPlan.current}`)
      return recargar()
    },
    error: 'No se pudo guardar el proyecto.',
  })
  const form = formulario.valores
  const editando = formulario.registro !== null
  const presupuestoNumero = Number(soloDigitos(form.presupuesto_inicial) || 0)

  // CU-02 Alt 2: el cliente no existe -> se registra aquí y queda seleccionado.
  const nuevoCliente = useFormulario(CLIENTE_VACIO, {
    enviar: (f) => clientesApi.crear(f),
    alGuardar: ({ cliente }) => {
      setClientes((prev) =>
        [...prev, cliente].sort((a, b) => a.razon_social_nombre.localeCompare(b.razon_social_nombre)),
      )
      formulario.cambiar('cliente_id', String(cliente.id))
      setAviso(`Cliente "${cliente.razon_social_nombre}" registrado y seleccionado.`)
    },
    error: 'No se pudo registrar el cliente.',
  })

  useEffect(() => {
    if (!gestionaProyectos) return
    // El responsable es un trabajador activo (HU-04), no un usuario del sistema.
    if (puede('clientes.listar')) clientesApi.listar().then(setClientes).catch(() => {})
    if (puede('trabajadores.listar')) trabajadoresApi.listar().then(setResponsables).catch(() => {})
  }, [gestionaProyectos])

  // La búsqueda de la barra superior puede cambiar estando ya en esta pantalla.
  useEffect(() => {
    const buscar = parametros.get('buscar')
    if (buscar !== null) cambiarFiltro('buscar', buscar)
  }, [parametros])

  // HU-18: baja lógica y reactivación de proyectos (nunca borrado físico).
  const cambiarBaja = (p) =>
    ejecutar(() => (p.activo ? proyectosApi.baja(p.id) : proyectosApi.reactivar(p.id)), {
      exito: `${p.nombre}: ${p.activo ? 'dado de baja' : 'reactivado'}.`,
      error: 'No se pudo cambiar el estado del proyecto.',
    })

  /** Pasa el proyecto a edición: el formulario se abre con sus datos actuales. */
  const abrirEditar = (p) => {
    setAviso('')
    formulario.abrir({
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
    }, p)
  }

  const campo = formulario.claseCampo
  // El backend limita el listado al alcance del rol (RBAC): estos roles ven
  // todos los proyectos; los demás, solo los asignados.
  const veTodos = puede('proyectos.acceso_total')

  useEffect(() => {
    if (!editarPedido.current || !proyectos) return
    const p = proyectos.find((x) => String(x.id) === editarPedido.current)
    editarPedido.current = null
    if (p && p.activo && puedeEditar) abrirEditar(p)
    else if (volverAlPlan.current) navegar(`/proyectos/${volverAlPlan.current}`)
  }, [proyectos])

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
      <PageHeader accion={<BotonActualizar onClick={recargar} />}
        title="Proyectos"
        subtitle="Registro, etapas, actividades y seguimiento de avance"
      >
        {puedeCrear && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => formulario.abrir()}
          >
            <PlusIcon className="h-5 w-5" /> Nuevo proyecto
          </button>
        )}
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Tipo de vista">
          {[
            ['tarjetas', 'Tarjetas', Squares2X2Icon],
            ['tabla', 'Tabla', TableCellsIcon],
          ].map(([v, texto, Icono]) => (
            <button
              key={v}
              type="button"
              aria-pressed={vista === v}
              aria-label={`Vista de ${texto.toLowerCase()}`}
              title={texto}
              onClick={() => cambiarVista(v)}
              className={`rounded-lg p-2 transition ${
                vista === v ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icono className="h-5 w-5" />
            </button>
          ))}
        </div>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {/* Búsqueda y filtros del listado (corren en la base) */}
      <FiltrosDesplegable
        pie={
          <Interruptor checked={incluirInactivos} onChange={setIncluirInactivos}>
            Dados de baja
          </Interruptor>
        }
       
        titulo="Buscar proyectos"
        ariaLabel="Filtros de proyectos"
        activos={filtrosActivos}
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

      {gestionaProyectos && (
        <ModalFormulario
          {...formulario.propsModal}
          onCerrar={() => {
            formulario.cerrar()
            if (volverAlPlan.current) navegar(`/proyectos/${volverAlPlan.current}`)
          }}
          titulo={editando ? 'Actualizar proyecto' : 'Registrar proyecto'}
          subtitulo={
            editando
              ? `Código ${form.codigo} · el cambio queda en la bitácora`
              : 'Queda en estado de planificación'
          }
          ancho="max-w-3xl"
          textoGuardar={editando ? 'Guardar cambios' : 'Registrar proyecto'}
          acciones={
            editando && formulario.registro.activo && puedeBaja ? (
              <button
                type="button"
                className="btn-ghost ml-auto text-red-600 hover:bg-red-50"
                onClick={() => setPorDarDeBaja(formulario.registro)}
              >
                <span aria-hidden="true">⚠️</span> Dar de baja
              </button>
            ) : null
          }
        >
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
                onChange={(e) => formulario.cambiar('codigo', e.target.value)}
                disabled={editando}
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
                onChange={(e) => formulario.cambiar('nombre', e.target.value)}
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
                onChange={(v) => formulario.cambiar('cliente_id', v)}
                opciones={opcionesClientes}
                placeholder="Escriba el nombre del cliente…"
                error={formulario.campo === 'cliente_id'}
                requerido
              />
              {puedeCrearCliente && (
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-brand-700 hover:underline"
                  onClick={() => (nuevoCliente.abierto ? nuevoCliente.cerrar() : nuevoCliente.abrir())}
                >
                  <BuildingOffice2Icon className="mr-1 inline h-4 w-4" />
                  El cliente no está en la lista: registrarlo
                </button>
              )}
            </div>
            <div>
              <label htmlFor="p-responsable" className="label">
                Responsable
              </label>
              <BuscadorSelect
                id="p-responsable"
                value={form.responsable_id}
                onChange={(v) => formulario.cambiar('responsable_id', v)}
                opciones={opcionesResponsables}
                placeholder="Escriba el nombre del responsable…"
                error={formulario.campo === 'responsable_id'}
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
                onChange={(e) => formulario.cambiar('fecha_inicio_programada', e.target.value)}
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
                min={form.fecha_inicio_programada || undefined}
                aria-invalid={fechasInvertidas(form)}
                onChange={(e) => formulario.cambiar('fecha_fin_programada', e.target.value)}
                required
              />
              {fechasInvertidas(form) && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  La fecha de fin debe ser posterior a la de inicio.
                </p>
              )}
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
                  onChange={(e) => formulario.cambiar('ubicacion', e.target.value)}
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
                    formulario.cambiar(
                      'presupuesto_inicial',
                      soloDigitos(e.target.value).slice(0, MAX_DIGITOS_PRESUPUESTO),
                    )
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
                onChange={(e) => formulario.cambiar('descripcion', e.target.value)}
              />
            </div>
          </div>
        </ModalFormulario>
      )}

      {/* Mapa para la ubicación: devuelve el texto normalizado al formulario. */}
      <SelectorUbicacion
        abierto={mapaAbierto}
        valorInicial={form.ubicacion}
        onCerrar={() => setMapaAbierto(false)}
        onAceptar={(texto) => {
          formulario.cambiar('ubicacion', texto)
          setMapaAbierto(false)
        }}
      />

      {/* CU-02 Alt 2: alta rápida del cliente dentro de su propia ventana. */}
      {puedeCrearCliente && (
        <ModalFormulario
          {...nuevoCliente.propsModal}
          titulo="Registrar cliente"
          subtitulo="Queda guardado en el catálogo y seleccionado en el proyecto"
          textoGuardar="Registrar cliente"
          espaciado="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-tipo" className="label">
                Tipo de documento
              </label>
              <select
                id="c-tipo"
                className="input"
                value={nuevoCliente.valores.tipo_documento}
                onChange={(e) => nuevoCliente.cambiar('tipo_documento', e.target.value)}
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
                value={nuevoCliente.valores.numero_documento}
                onChange={(e) => nuevoCliente.cambiar('numero_documento', e.target.value)}
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
              value={nuevoCliente.valores.razon_social_nombre}
              onChange={(e) => nuevoCliente.cambiar('razon_social_nombre', e.target.value)}
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
                value={nuevoCliente.valores.nombre_contacto}
                onChange={(e) => nuevoCliente.cambiar('nombre_contacto', e.target.value)}
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
                value={nuevoCliente.valores.telefono}
                onChange={(e) => nuevoCliente.cambiar('telefono', e.target.value)}
              />
            </div>
          </div>
        </ModalFormulario>
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
              : puedeCrear
                ? 'Registre el primer proyecto con el botón «Nuevo proyecto».'
                : 'Todavía no hay proyectos registrados para usted.'}
          </p>
        </div>
      )}

      {proyectos !== null && proyectos.length > 0 && vista === 'tarjetas' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proyectos.map((p) => (
            <TarjetaProyecto
              key={p.id}
              p={p}
              onAbrir={(p) => (p.activo ? navegar(`/proyectos/${p.id}`) : setMenu(p))}
              enlaceResponsable={enlaceResponsable}
              enlaceCliente={enlaceCliente}
            />
          ))}
        </div>
      )}

      {proyectos !== null && proyectos.length > 0 && vista === 'tabla' && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={proyectos}
            minWidth="md:min-w-[720px]"
            filaClase={() => 'transition hover:bg-slate-50/70'}
            ficha={{
              titulo: (p) => p.nombre,
              subtitulo: (p) => p.codigo,
              extras: (p) => [
                ['Cliente', p.cliente_nombre],
                ['Responsable', p.responsable_nombre],
                ['Inicio', fmtFecha(p.fecha_inicio_programada)],
                ['Fin', fmtFecha(p.fecha_fin_programada)],
              ],
            }}
            columnas={[
              {
                titulo: 'Proyecto',
                movil: true,
                // Mismo ancho máximo que Ubicación (solo escritorio): las dos columnas quedan a la par.
                tdClase: 'md:max-w-[9.25rem]',
                celda: (p) => (
                  <>
                    <p className="font-semibold text-slate-900">{p.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {p.codigo} · {p.cliente_nombre} · {fmtFecha(p.fecha_inicio_programada)}
                    </p>
                  </>
                ),
              },
              { titulo: 'Responsable', movil: true, tdClase: 'text-slate-600', celda: (p) => p.responsable_nombre },
              {
                titulo: 'Ubicación',
                // Ancho igual al de Proyecto. El texto va en posición absoluta: llena el alto que
                // marca la fila (definido por Proyecto) y no la hace crecer.
                tdClase: 'relative md:w-[9.25rem] md:min-w-[9.25rem] md:max-w-[9.25rem] text-slate-600',
                celda: (p) => <UbicacionCopiable texto={p.ubicacion} />,
                valor: (p) => p.ubicacion,
              },
              {
                titulo: 'Presupuesto',
                tdClase: 'font-medium tabular-nums text-slate-700',
                celda: (p) => fmtCOP(Number(p.presupuesto_inicial)),
              },
              {
                titulo: 'Estado',
                celda: (p) => {
                  const est = estadoProyecto[p.estado?.toLowerCase()] ?? estadoProyecto.planificacion
                  return <span className={`badge badge-tabla ring-1 ${est.cls}`}>{est.label}</span>
                },
              },
              {
                titulo: 'Avance',
                thClase: 'md:w-36',
                celda: (p) => {
                  const avance = Number(p.porcentaje_avance_total)
                  return (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-brand-100">
                        <div
                          className="h-full rounded-full bg-accent-500 transition-all"
                          style={{ width: `${avance}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-slate-600">{avance}%</span>
                    </div>
                  )
                },
              },
              {
                titulo: 'Plan',
                acciones: true,
                celda: (p) => (
                  <Link to={`/proyectos/${p.id}`} className="btn-accion btn-accion-plan">
                    <ClipboardDocumentListIcon className="h-4 w-4" /> Plan
                  </Link>
                ),
              },
              {
                titulo: 'Acciones',
                acciones: true,
                celda: (p, enFicha) => {
                  if (!puedeEditar && !puedeBaja) return null
                  const botones = (
                    <>
                      {!!p.activo && puedeEditar && (
                        <button
                          className="btn-accion btn-accion-editar"
                          onClick={() => abrirEditar(p)}
                          aria-label={`Actualizar ${p.nombre}`}
                        >
                          <PencilSquareIcon className="h-4 w-4" /> Editar
                        </button>
                      )}
                      {puedeBaja && (
                        <button
                          className={`btn-accion ${p.activo ? 'btn-accion-peligro' : 'btn-accion-ok'}`}
                          onClick={() => cambiarBaja(p)}
                          aria-label={p.activo ? `Dar de baja ${p.nombre}` : `Reactivar ${p.nombre}`}
                        >
                          {p.activo ? 'Dar de baja' : 'Reactivar'}
                        </button>
                      )}
                    </>
                  )
                  return enFicha ? botones : <div className="flex flex-col items-stretch gap-1.5">{botones}</div>
                },
              },
            ]}
          />
        </div>
      )}

      {/* Menú de la tarjeta: abrir el plan es lo principal; editar y reactivar según permisos. */}
      <Modal
        abierto={!!menu}
        titulo={menu?.nombre ?? ''}
        subtitulo={menu ? `${menu.codigo} · ${menu.cliente_nombre}` : ''}
        onCerrar={() => setMenu(null)}
        ancho="max-w-sm"
      >
        {menu && (
          <div className="flex flex-col gap-2">
            <Link to={`/proyectos/${menu.id}`} className="btn-primary justify-center" onClick={() => setMenu(null)}>
              <ClipboardDocumentListIcon className="h-5 w-5" /> Abrir plan
            </Link>
            {!menu.activo && puedeBaja && (
              <button
                type="button"
                className="btn-ghost justify-center"
                onClick={() => {
                  const p = menu
                  setMenu(null)
                  cambiarBaja(p)
                }}
              >
                Reactivar
              </button>
            )}
          </div>
        )}
      </Modal>

      <Modal
        abierto={!!porDarDeBaja}
        titulo={porDarDeBaja ? `¿Dar de baja «${porDarDeBaja.nombre}»?` : ''}
        onCerrar={() => setPorDarDeBaja(null)}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">
          El proyecto deja de aparecer en la lista y no se borra nada: su historial se conserva y se puede
          reactivar desde «Dados de baja».
        </p>
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              const p = porDarDeBaja
              setPorDarDeBaja(null)
              formulario.cerrar()
              await cambiarBaja(p)
            }}
          >
            Dar de baja
          </button>
          <button type="button" className="btn-ghost" onClick={() => setPorDarDeBaja(null)}>
            Cancelar
          </button>
        </div>
      </Modal>

      <p className="text-xs text-slate-400">
        El avance del proyecto se deriva de sus actividades según la regla de cálculo definida por la
        empresa. Las etapas y actividades con responsables y fechas se administran desde el plan de
        cada proyecto.
      </p>
    </div>
  )
}
