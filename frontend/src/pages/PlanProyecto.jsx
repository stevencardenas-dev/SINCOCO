import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { urlListado } from '../hooks/useListadoUrl'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  Squares2X2Icon,
  ArrowUturnLeftIcon,
  CheckIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  CubeIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import Retractil from '../components/Retractil.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
import PageHeader from '../components/PageHeader.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import Ficha from '../components/Ficha.jsx'
import CronogramaPlan from '../components/CronogramaPlan.jsx'
import GestionEtapas from '../components/GestionEtapas.jsx'
import { colorEtapa } from '../lib/coloresEtapa.js'
import EncabezadoOrdenable from '../components/EncabezadoOrdenable.jsx'
import { alternarOrden, ordenarFilas } from '../lib/ordenarTabla.js'
import { useAuth } from '../context/AuthContext.jsx'
import { proyectosApi } from '../services/proyectos'
import { etapasApi } from '../services/etapas'
import { actividadesApi } from '../services/actividades'
import { incidenciasApi } from '../services/incidencias'
import { trabajadoresApi } from '../services/trabajadores'
import { asignacionesApi } from '../services/asignaciones'
import AplicarPlantillaEtapas from '../components/AplicarPlantillaEtapas.jsx'
import ExtenderAsignacion from '../components/ExtenderAsignacion.jsx'
import RegistrarAvance from '../components/RegistrarAvance.jsx'
import PresupuestoMateriales from '../components/PresupuestoMateriales.jsx'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'
import { mensajeError } from '../lib/errores.js'
import { fmtFecha, fmtCOP, fmtCOPCompacto, fmtMiles, soloDigitos, ESFUERZOS, etiquetaEsfuerzo } from '../lib/format.js'

/**
 * HU-03 (RF03 · RF04): plan de trabajo de un proyecto. Define etapas y, dentro
 * de cada etapa, actividades con responsable y fechas. El backend valida que
 * las fechas queden dentro del rango del proyecto y que la etapa pertenezca al
 * proyecto.
 */

const ETAPA_VACIA = { nombre: '', descripcion: '', fecha_inicio_programada: '', fecha_fin_programada: '' }
const REPROGRAMACION_VACIA = { motivo: '', fecha_inicio_programada: '', fecha_fin_programada: '', confirmar: false }
const ACTIVIDAD_VACIA = { nombre: '', responsable_id: '', fecha_inicio_programada: '', fecha_fin_programada: '', esfuerzo: 'MEDIO', presupuesto: '', criterios: [''] }
const ACCESO_VACIO = {
  trabajador_id: '',
  actividad_id: '',
  observaciones: '',
  fecha_inicio: '',
  fecha_fin_programada: '',
}

const FILTRO_ACCESO_VACIO = { buscar: '', estado: '', alcance: '', actividad: '', vencen: false }

// "Vencen pronto": asignaciones vigentes cuyo fin programado cae en este plazo.
const DIAS_POR_VENCER = 30

// Acceso mientras carga (o si el servidor no lo informa): solo consulta.
const SIN_ACCESO = { gestiona_plan: false, actividades_ids: [] }

const ESTADO_ASIGNACION = {
  ACTIVO: 'bg-emerald-50 text-emerald-700',
  FINALIZADO: 'bg-slate-100 text-slate-600',
  REASIGNADO: 'bg-amber-50 text-amber-700',
  CANCELADO: 'bg-red-50 text-red-700',
}

const ESTADO_BADGE = {
  PENDIENTE: 'bg-slate-100 text-slate-600',
  EN_PROCESO: 'bg-yellow-100 text-yellow-800',
  COMPLETADA: 'bg-emerald-50 text-emerald-700',
  ATRASADA: 'bg-red-50 text-red-700',
  SUSPENDIDA: 'bg-orange-50 text-orange-700',
}

const ESTADO_ETIQUETA = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En curso',
  COMPLETADA: 'Finalizado',
  ATRASADA: 'Atrasada',
  SUSPENDIDA: 'Suspendida',
}

/** Estado que se muestra: «Atrasada» si ya pasó su fecha fin y no está finalizada (lo calcula el servidor). */
const estadoVisible = (a) => (a.atrasada ? 'ATRASADA' : a.estado)

/** Fecha 'YYYY-MM-DD' (o ISO) -> 'YYYY-MM-DD', sin desplazarla por la zona horaria. */
const soloDia = (valor) => String(valor ?? '').slice(0, 10)

/**
 * Fecha sugerida bajo un campo de fecha. No limita el calendario: al pulsarla
 * se copia al campo. Desaparece cuando el campo ya tiene ese día.
 */
function SugerenciaFecha({ dia, origen, actual, onUsar }) {
  if (!dia || dia === actual) return null
  return (
    <button
      type="button"
      onClick={() => onUsar(dia)}
      className="mt-1 text-left text-xs text-brand-600 hover:text-brand-800 hover:underline"
      title="Usar esta fecha"
    >
      Sugerida: {fmtFecha(dia)} · {origen}
    </button>
  )
}

/**
 * Descripción de una asignación: se ajusta en varias líneas, se recorta a 4
 * con puntos suspensivos (el texto completo sale al pasar el cursor) y tiene un
 * botón para copiarla. Misma presentación que la ubicación en /proyectos; aquí
 * la fila crece según el texto, porque ninguna otra columna fija su alto.
 */
function DescripcionCopiable({ texto }) {
  const [copiado, setCopiado] = useState(false)
  if (!texto) return <span className="text-slate-400">—</span>

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
    <span className="flex items-center gap-1">
      <span className="line-clamp-4 min-w-0 whitespace-normal break-words" title={texto}>
        {texto}
      </span>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        title={copiado ? 'Copiado' : 'Copiar descripción'}
        aria-label="Copiar descripción"
      >
        {copiado ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
      </button>
    </span>
  )
}

// Claves de orden de las tablas del plan (las fechas ISO ordenan como texto).
const CLAVES_ACTIVIDAD = {
  Actividad: (a) => a.nombre,
  Responsable: (a) => a.responsable_nombre,
  Fechas: (a) => a.fecha_inicio_programada,
  Estado: (a) => ESTADO_ETIQUETA[estadoVisible(a)] ?? a.estado,
  Avance: (a) => Number(a.porcentaje_avance),
}
const CLAVES_GRUPOS = {
  Trabajador: (g) => g.trabajador_nombre,
  Cargo: (g) => g.cargo,
  Alcance: (g) => g.alcance,
  Estado: (g) => g.estado,
}

const CLAVES_ACCESO = {
  Trabajador: (a) => a.trabajador_nombre,
  'Descripción de la asignación': (a) => a.observaciones,
  Actividad: (a) => a.actividad_nombre ?? 'Todo el proyecto',
  Vigencia: (a) => a.fecha_inicio,
  Estado: (a) => a.estado,
}

export default function PlanProyecto() {
  const { id } = useParams()
  const [parametros, setParametros] = useSearchParams()
  const [verBajas, setVerBajas] = useState(false) // HU-18: mostrar también las etapas dadas de baja
  const { puede } = useAuth()
  // La interfaz sigue la matriz de permisos, no el nombre del rol.
  // Además del permiso del rol, el plan solo lo modifica el líder del proyecto,
  // el gerente y el administrador (`gestiona_plan`, que calcula el servidor).
  // Quien solo está asignado consulta el plan y actúa en lo suyo.
  const { datos, error, aviso, setAviso, recargar, ejecutar } = useRecurso(
    async () => {
      // Personal, asignaciones y acceso dependen de permisos que el rol puede no
      // tener: si fallan, el plan se muestra igual sin esa parte.
      const [proyectos, etapas, actividades, responsables, asignaciones, miAcceso, afectadas] = await Promise.all([
        proyectosApi.listar(),
        etapasApi.listar({ proyecto_id: id, incluirInactivos: verBajas }),
        actividadesApi.listar({ proyecto_id: id }),
        trabajadoresApi.listar().catch(() => []),
        asignacionesApi.listar({ proyecto_id: id }).catch(() => []),
        proyectosApi.miAcceso(id).catch(() => SIN_ACCESO),
        // HU-14: sin el permiso de incidencias el plan se muestra igual, sin el resaltado.
        incidenciasApi.afectadas(id).catch(() => ({ actividades_ids: [] })),
      ])
      const proyecto = proyectos.find((x) => String(x.id) === String(id)) ?? null
      return { proyecto, etapas, actividades, responsables, asignaciones, miAcceso, afectadas: afectadas.actividades_ids }
    },
    [id, verBajas],
    { mensaje: 'No se pudo cargar el plan de trabajo.' },
  )
  const proyecto = datos?.proyecto ?? null
  const todasEtapas = datos?.etapas ?? []
  const estaActiva = (e) => e.activo !== 0 && e.activo !== false
  const etapas = todasEtapas.filter(estaActiva)
  const etapasBaja = todasEtapas.filter((e) => !estaActiva(e))
  const actividades = datos?.actividades ?? []
  // Lo repartido entre las actividades, frente al presupuesto inicial del proyecto.
  const presupuestoAsignado = etapas.reduce((total, et) => total + Number(et.presupuesto ?? 0), 0)
  // Indicadores del resumen del proyecto.
  const avanceProyecto = Math.round(Number(proyecto?.porcentaje_avance_total ?? 0))
  const atrasadas = actividades.filter((a) => a.atrasada).length
  const diasRestantes = proyecto?.fecha_fin_programada
    ? Math.ceil((new Date(`${soloDia(proyecto.fecha_fin_programada)}T00:00:00`) - new Date(new Date().toDateString())) / 86400000)
    : 0
  const responsables = datos?.responsables ?? []
  const conIncidencia = new Set(datos?.afectadas ?? []) // HU-14: actividades a resaltar
  // Responsables de actividad: solo quienes tienen acceso vigente al proyecto (o su responsable).
  // `actual` conserva al responsable ya guardado al editar, aunque haya perdido el acceso.
  const miembrosPara = (actual = null) => {
    const ids = new Set(asignaciones.filter((a) => a.estado === 'ACTIVO').map((a) => a.trabajador_id))
    return responsables.filter((t) => ids.has(t.id) || t.id === datos?.proyecto?.responsable_id || (actual && String(t.id) === String(actual)))
  }
  const asignaciones = datos?.asignaciones ?? []
  const [porExtender, setPorExtender] = useState(null) // HU-31
  const miAcceso = datos?.miAcceso ?? SIN_ACCESO

  const gestionaPlan = miAcceso.gestiona_plan
  const puedeEtapas = gestionaPlan && puede('etapas.crear')
  const puedeAplicarPlantilla = gestionaPlan && puede('etapas.aplicar_plantilla')
  const [plantillaAbierta, setPlantillaAbierta] = useState(false)
  const puedeActividades = gestionaPlan && puede('actividades.crear')
  const puedeEditarEtapas = gestionaPlan && puede('etapas.editar')
  const puedeBajaEtapas = gestionaPlan && puede('etapas.dar_baja')
  const [etapaPorBaja, setEtapaPorBaja] = useState(null) // HU-18: confirmación de baja
  const puedeEditarActividades = gestionaPlan && puede('actividades.editar')
  // HU-34: reprogramar fechas (solo administrador); no aplica a lo ya completado.
  const puedeReprogramarEtapas = gestionaPlan && puede('etapas.reprogramar')
  const puedeReprogramarActividades = gestionaPlan && puede('actividades.reprogramar')
  // «Registrar avance»: en cualquier actividad para quien gestiona el plan; si no, solo en las suyas.
  const puedeAvance = (a) => gestionaPlan || miAcceso.actividades_ids.includes(a.id)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)
  const [porAvanzar, setPorAvanzar] = useState(null) // HU-21: actividad cuyo avance se registra
  const [presupuestando, setPresupuestando] = useState(null) // HU-08: actividad cuyo presupuesto de materiales se consulta
  const [fichaVer, setFichaVer] = useState(null) // { tipo: 'etapa' | 'actividad', dato }
  const puedeAcceso = puede('proyectos.gestionar_acceso')
  // Submódulos de la página: se recuerdan en la URL (?vista=) para poder recargar o compartir.
  const vigentes = asignaciones.filter((a) => a.estado === 'ACTIVO').length
  const SECCIONES = [
    { id: 'resumen', label: 'Resumen', icono: ChartPieIcon, cuenta: null },
    { id: 'cronograma', label: 'Cronograma', icono: CalendarDaysIcon, cuenta: null },
    { id: 'etapas', label: 'Etapas', icono: Squares2X2Icon, cuenta: etapas.length, ayuda: `${etapas.length} ${etapas.length === 1 ? 'etapa' : 'etapas'} en el plan` },
    ...(puedeAcceso ? [{ id: 'acceso', label: 'Acceso', icono: UsersIcon, cuenta: vigentes, ayuda: `${vigentes} con acceso vigente` }] : []),
  ]
  const pedida = parametros.get('vista')
  const vista = SECCIONES.some((x) => x.id === pedida) ? pedida : 'cronograma'
  const irA = (v) =>
    setParametros((p) => { const n = new URLSearchParams(p); n.set('vista', v); return n }, { replace: true })
  const puedeExtender = puede('asignaciones.extender') // HU-31: solo el administrador

  // Formularios del plan. Los errores de negocio se muestran dentro de cada
  // formulario, no sobre la tabla.
  const nuevaEtapa = useFormulario(ETAPA_VACIA, {
    enviar: (f) => etapasApi.crear({ ...f, proyecto_id: Number(id) }),
    alGuardar: () => {
      setAviso('Etapa registrada.')
      return recargar()
    },
    error: 'No se pudo registrar la etapa.',
  })

  // `registro` es el id de la etapa donde se está agregando la actividad.
  const nuevaActividad = useFormulario(ACTIVIDAD_VACIA, {
    enviar: (f, etapaId) =>
      actividadesApi.crear({ ...f, etapa_id: etapaId, responsable_id: f.responsable_id || null, presupuesto: soloDigitos(f.presupuesto) }),
    alGuardar: () => {
      setAviso('Actividad registrada.')
      return recargar()
    },
    error: 'No se pudo registrar la actividad.',
  })
  const actividadEn = nuevaActividad.registro
  const etapaNueva = etapas.find((x) => x.id === actividadEn) ?? null // etapa donde se agrega la actividad

  // Edición en ventana: `registro` es { tipo: 'etapa' | 'actividad', dato }.
  // HU-34 · criterio 5: las fechas ya definidas no se editan aquí, se reprograman.
  const fechasFijas = (dato) => Boolean(dato?.fecha_inicio_programada && dato?.fecha_fin_programada)
  const sinFechas = (f, dato) => {
    if (!fechasFijas(dato)) return f
    const { fecha_inicio_programada: _i, fecha_fin_programada: _f, ...resto } = f
    return resto
  }
  const edicion = useFormulario(ETAPA_VACIA, {
    enviar: (f, { tipo, dato }) =>
      tipo === 'etapa'
        ? etapasApi.actualizar(dato.id, sinFechas(f, dato))
        : actividadesApi.actualizar(dato.id, { ...sinFechas(f, dato), responsable_id: f.responsable_id || null, presupuesto: soloDigitos(f.presupuesto) }),
    alGuardar: (_, { registro }) => {
      setAviso(registro.tipo === 'etapa' ? 'Etapa actualizada.' : 'Actividad actualizada.')
      return recargar()
    },
    error: 'No se pudo guardar el cambio.',
  })
  const editandoEtapa = edicion.registro?.tipo === 'etapa' ? edicion.registro.dato : null
  const editandoActividad = edicion.registro?.tipo === 'actividad' ? edicion.registro.dato : null

  // HU-34 · criterio 2: reprogramación en ventana, con motivo obligatorio.
  // `registro` es { tipo: 'etapa' | 'actividad', dato }.
  // Criterio 4: si el recálculo excede el fin del proyecto la API advierte (409);
  // el formulario pide entonces la confirmación explícita antes de reenviar.
  const [requiereConfirmacion, setRequiereConfirmacion] = useState(false)
  const [afectadas, setAfectadas] = useState([])
  const reprogramacion = useFormulario(REPROGRAMACION_VACIA, {
    enviar: async (f, { tipo, dato }) => {
      try {
        return await (tipo === 'etapa' ? etapasApi.reprogramar(dato.id, f) : actividadesApi.reprogramar(dato.id, f))
      } catch (err) {
        setRequiereConfirmacion(err.response?.data?.codigo === 'REQUIERE_CONFIRMACION')
        throw err
      }
    },
    alGuardar: (data, { registro }) => {
      // Criterio 6: asignaciones que quedan fuera de las nuevas fechas (no se modifican).
      setAfectadas(data.asignaciones_afectadas ?? [])
      // Criterio 3: avisa cuántas etapas posteriores se recalcularon.
      const movidas = data.etapas_desplazadas?.length ?? 0
      // Criterio 6: las asignaciones que ya no encajan solo se informan; no se modifican.
      const fuera = data.asignaciones_fuera_de_fechas ?? []
      const avisoAsignaciones = fuera.length
        ? ` Atención: ${fuera.length} asignación(es) quedan fuera de las nuevas fechas (${[
            ...new Set(fuera.map((a) => `${a.trabajador_nombre} en ${a.actividad_nombre}`)),
          ].join('; ')}). No se modificaron: ajústelas con «Extender» o reasigne al personal.`
        : ''
      setAviso(
        (registro.tipo === 'etapa'
          ? `Etapa reprogramada.${movidas ? ` Se recalcularon ${movidas} etapa(s) posterior(es).` : ''}`
          : 'Actividad reprogramada.') + avisoAsignaciones,
      )
      return recargar()
    },
    error: 'No se pudo reprogramar.',
  })
  const reprogramandoEtapa = reprogramacion.registro?.tipo === 'etapa' ? reprogramacion.registro.dato : null
  const reprogramandoActividad = reprogramacion.registro?.tipo === 'actividad' ? reprogramacion.registro.dato : null

  // Gestión de acceso (RBAC): quién puede consultar este proyecto. El
  // formulario está siempre a la vista; al guardar solo se vacía.
  const acceso = useFormulario(ACCESO_VACIO, {
    enviar: (f) =>
      asignacionesApi.crear({
        proyecto_id: Number(id),
        trabajador_id: Number(f.trabajador_id),
        actividad_id: f.actividad_id ? Number(f.actividad_id) : null,
        observaciones: f.observaciones,
        fecha_inicio: f.fecha_inicio,
        fecha_fin_programada: f.fecha_fin_programada || null,
      }),
    alGuardar: (data) => {
      setAviso(`${data.asignacion.trabajador_nombre} tiene acceso al proyecto.`)
      return recargar()
    },
    error: 'No se pudo asignar el personal.',
  })
  const accesoForm = acceso.valores
  // Búsqueda y filtros del listado de acceso (se aplican en el cliente).
  const filtrosAcceso = useFiltros(FILTRO_ACCESO_VACIO)
  const filtroAcceso = filtrosAcceso.filtros

  // Rango del proyecto: límite de las fechas de etapas y actividades (HU-03).
  const proyDesde = soloDia(proyecto?.fecha_inicio_programada)
  const proyHasta = soloDia(proyecto?.fecha_fin_programada)

  // Fechas sugeridas para una asignación: las de la actividad elegida o, si es
  // para todo el proyecto, las del proyecto. Son una ayuda: no limitan el calendario.
  const actividadAcceso = actividades.find((a) => String(a.id) === String(accesoForm.actividad_id))
  const sugerenciaAcceso = actividadAcceso
    ? {
        inicio: soloDia(actividadAcceso.fecha_inicio_programada),
        fin: soloDia(actividadAcceso.fecha_fin_programada),
        origen: (cual) => `${cual} de la actividad «${actividadAcceso.nombre}»`,
      }
    : { inicio: proyDesde, fin: proyHasta, origen: (cual) => `${cual} del proyecto` }

  // Listado de acceso filtrado: texto libre y filtros combinados con "y".
  const filtrosActivos = filtrosAcceso.activos
  const [ordenActs, setOrdenActs] = useState(null)
  const [ordenAcceso, setOrdenAcceso] = useState(null)
  const asignacionesFiltradas = asignaciones.filter((a) => {
    const f = filtroAcceso
    const texto = [a.trabajador_nombre, a.observaciones, a.actividad_nombre, a.cargo]
      .filter(Boolean).join(' ').toLowerCase()
    if (f.buscar && !texto.includes(f.buscar.trim().toLowerCase())) return false
    if (f.estado && a.estado !== f.estado) return false
    if (f.alcance === 'PROYECTO' && a.actividad_id) return false
    if (f.alcance === 'ACTIVIDAD' && !a.actividad_id) return false
    if (f.actividad && String(a.actividad_id) !== f.actividad) return false
    if (f.vencen) {
      if (a.estado !== 'ACTIVO' || !a.fecha_fin_programada) return false
      const dias = (new Date(soloDia(a.fecha_fin_programada)) - new Date(new Date().toISOString().slice(0, 10))) / 86400000
      if (dias < 0 || dias > DIAS_POR_VENCER) return false
    }
    return true
  })

  // Una fila por trabajador; el detalle (acceso general y actividades) va en una ventana.
  const [ordenGrupos, setOrdenGrupos] = useState(null)
  const [grupoAbierto, setGrupoAbierto] = useState(null)
  const gruposAcceso = [...asignacionesFiltradas.reduce((m, a) => {
    const g = m.get(a.trabajador_id) ?? { trabajador_id: a.trabajador_id, trabajador_nombre: a.trabajador_nombre, cargo: a.cargo, filas: [] }
    g.filas.push(a)
    return m.set(a.trabajador_id, g)
  }, new Map()).values()].map((g) => {
    const vigentes = g.filas.filter((a) => a.estado === 'ACTIVO')
    const actividades = vigentes.filter((a) => a.actividad_id).length
    return {
      ...g,
      estado: vigentes.length ? 'ACTIVO' : g.filas[0].estado,
      alcance: vigentes.some((a) => !a.actividad_id)
        ? 'Todo el proyecto'
        : actividades ? `${actividades} ${actividades === 1 ? 'actividad' : 'actividades'}` : 'Sin acceso vigente',
    }
  })
  const grupoElegido = gruposAcceso.find((g) => g.trabajador_id === grupoAbierto)
  const filasDelGrupo = grupoElegido?.filas ?? []

  /** Rango permitido para las actividades de una etapa (por defecto, el del proyecto). */
  const limiteEtapa = (et) => ({
    min: soloDia(et.fecha_inicio_programada) || soloDia(proyecto?.fecha_inicio_programada),
    max: soloDia(et.fecha_fin_programada) || soloDia(proyecto?.fecha_fin_programada),
  })

  /**
   * Cierra la asignación vigente sin borrarla (queda el historial).
   * HU-05 · criterio 3: FINALIZADO (se cumplió; registra la fecha fin real y el
   * trabajador vuelve a estar disponible) o CANCELADO (se anuló antes de cumplirse).
   */
  const cerrarAsignacion = async (a, estado) => {
    acceso.setError('')
    setAviso('')
    try {
      await asignacionesApi.actualizar(a.id, { estado })
      setAviso(
        estado === 'CANCELADO'
          ? `${a.trabajador_nombre}: asignación cancelada.`
          : `${a.trabajador_nombre}: asignación finalizada; el trabajador queda disponible.`,
      )
      recargar()
    } catch (err) {
      acceso.setError(mensajeError(err, 'No se pudo actualizar la asignación.'))
    }
  }
  const finalizarAsignacion = (a) => cerrarAsignacion(a, 'FINALIZADO')
  const cancelarAsignacion = (a) => cerrarAsignacion(a, 'CANCELADO')

  const abrirEdicionEtapa = (et) =>
    edicion.abrir(
      {
        nombre: et.nombre,
        descripcion: et.descripcion ?? '',
        fecha_inicio_programada: soloDia(et.fecha_inicio_programada),
        fecha_fin_programada: soloDia(et.fecha_fin_programada),
      },
      { tipo: 'etapa', dato: et },
    )

  const abrirReprogramacion = (tipo, dato) => {
    setRequiereConfirmacion(false)
    setAfectadas([])
    reprogramacion.abrir(
      {
        motivo: '',
        fecha_inicio_programada: soloDia(dato.fecha_inicio_programada),
        fecha_fin_programada: soloDia(dato.fecha_fin_programada),
        confirmar: false,
      },
      { tipo, dato },
    )
  }

  const abrirEdicionActividad = (a) =>
    edicion.abrir(
      {
        nombre: a.nombre,
        descripcion: a.descripcion ?? '',
        responsable_id: a.responsable_id ?? '',
        fecha_inicio_programada: soloDia(a.fecha_inicio_programada),
        fecha_fin_programada: soloDia(a.fecha_fin_programada),
        esfuerzo: a.esfuerzo ?? 'MEDIO',
        presupuesto: a.presupuesto == null ? '' : String(Math.round(a.presupuesto)),
      },
      { tipo: 'actividad', dato: a },
    )

  const empezarEtapa = async (et) => {
    setCambiandoEstado(`e${et.id}`)
    await ejecutar(() => etapasApi.iniciar(et.id), {
      exito: `Etapa «${et.nombre}» en curso; se registró la fecha real de inicio.`,
      error: 'No se pudo empezar la etapa.',
    })
    setCambiandoEstado(null)
  }

  /** «Empezar» (pendiente -> en curso) y «Finalizar» (en curso -> finalizado). */
  const cambiarEstado = async (a) => {
    const empezar = a.estado === 'PENDIENTE'
    setCambiandoEstado(a.id)
    await ejecutar(() => (empezar ? actividadesApi.iniciar(a.id) : actividadesApi.finalizar(a.id)), {
      exito: empezar ? `«${a.nombre}» está en curso.` : `«${a.nombre}» quedó finalizada.`,
      error: 'No se pudo cambiar el estado de la actividad.',
    })
    setCambiandoEstado(null)
  }


  return (
    <div className="space-y-6">
      <Link to={urlListado('/proyectos')} className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeftIcon className="h-4 w-4" /> Volver a proyectos
      </Link>

      <PageHeader accion={<BotonActualizar onClick={recargar} />}
        title={proyecto ? proyecto.nombre : `Proyecto #${id}`}
        subtitle={proyecto ? `${proyecto.codigo} · ${fmtFecha(proyecto.fecha_inicio_programada)} — ${fmtFecha(proyecto.fecha_fin_programada)}` : 'Plan de trabajo'}
      >
        {proyecto?.activo !== 0 && proyecto?.activo !== false && puede('proyectos.editar') && (
          <Link to={`/proyectos?editar=${id}&volver=plan`} className="btn-ghost">
            <PencilSquareIcon className="h-5 w-5" /> Editar proyecto
          </Link>
        )}
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {/* Conmutador de submódulos: la pastilla deslizante marca en cuál se está. */}
      <div role="tablist" aria-label="Secciones del proyecto"
        className="relative grid w-full max-w-xl rounded-2xl bg-slate-100 p-1"
        style={{ gridTemplateColumns: `repeat(${SECCIONES.length}, minmax(0, 1fr))` }}>
        <span aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-xl bg-brand-900 shadow-md transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${SECCIONES.length})`,
            transform: `translateX(${SECCIONES.findIndex((x) => x.id === vista) * 100}%)`,
          }} />
        {SECCIONES.map((x) => {
          const activa = x.id === vista
          return (
            <button key={x.id} type="button" role="tab" aria-selected={activa} onClick={() => irA(x.id)}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                activa ? 'text-white' : 'text-slate-500 hover:text-brand-800'
              }`}>
              <x.icono className={`h-5 w-5 ${activa ? 'text-accent-400' : ''}`} />
              {x.label}
              {x.cuenta != null && (
                <span title={x.ayuda} aria-label={x.ayuda} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activa ? 'bg-accent-400 text-brand-950' : 'bg-white text-slate-600'}`}>
                  {x.cuenta}
                </span>
              )}
            </button>
          )
        })}
      </div>


      {/* HU-18: la baja es lógica; la etapa y sus actividades se conservan en el historial. */}
      <Modal abierto={Boolean(etapaPorBaja)} titulo="Dar de baja la etapa" subtitulo={etapaPorBaja?.nombre}
        onCerrar={() => setEtapaPorBaja(null)}>
        <p className="text-sm text-slate-600">
          La etapa dejará de mostrarse en el plan y sus actividades no contarán en el avance del proyecto.
          No se borra: queda en el historial y se puede reactivar.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setEtapaPorBaja(null)}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={async () => {
            const et = etapaPorBaja
            setEtapaPorBaja(null)
            await ejecutar(() => etapasApi.baja(et.id), {
              exito: `Etapa «${et.nombre}» dada de baja.`,
              error: 'No se pudo dar de baja la etapa.',
            })
          }}>
            Dar de baja
          </button>
        </div>
      </Modal>

      {puedeAplicarPlantilla && (
        <AplicarPlantillaEtapas abierto={plantillaAbierta} proyectoId={id}
          onCerrar={() => setPlantillaAbierta(false)}
          onAplicada={async (r) => {
            setPlantillaAbierta(false)
            await recargar()
            setAviso(`Plantilla «${r.plantilla}» aplicada: ${r.creadas} etapa(s) creada(s)${r.omitidas.length ? `, ${r.omitidas.length} omitida(s) por repetir nombre` : ''}. Defina sus fechas con «Editar».`)
          }} />
      )}

      {/* HU-34 · criterio 6: asignaciones fuera de las nuevas fechas; se listan, no se modifican. */}
      {afectadas.length > 0 && (
        <div className="card space-y-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            {afectadas.length} asignación(es) de personal quedan fuera de las nuevas fechas de la actividad.
            No se modificaron: extiéndalas o ajústelas desde «Gestión de acceso».
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs">
            {afectadas.map((a) => (
              <li key={a.id}>
                {a.trabajador_nombre} · {a.actividad_nombre}: asignado {fmtFecha(a.fecha_inicio)}
                {a.fecha_fin_programada ? ` — ${fmtFecha(a.fecha_fin_programada)}` : ' (sin fin)'}; actividad
                {' '}{fmtFecha(a.actividad_inicio_nuevo)} — {fmtFecha(a.actividad_fin_nuevo)}
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost text-xs" onClick={() => setAfectadas([])}>Entendido</button>
        </div>
      )}

      {vista === 'etapas' && puedeEtapas && nuevaEtapa.abierto && (
        <form onSubmit={nuevaEtapa.guardar} className="card space-y-4 p-6">
          <h3 className="text-base font-semibold text-slate-900">Definir etapa</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="e-nombre" className="label">Nombre</label>
              <input id="e-nombre" className="input" maxLength={100} value={nuevaEtapa.valores.nombre}
                onChange={(e) => nuevaEtapa.cambiar('nombre', e.target.value)} required />
            </div>
            <div>
              <label htmlFor="e-inicio" className="label">Inicio programado</label>
              <input id="e-inicio" type="date" className="input" required value={nuevaEtapa.valores.fecha_inicio_programada}
                min={proyDesde || undefined} max={nuevaEtapa.valores.fecha_fin_programada || proyHasta || undefined}
                onChange={(e) => nuevaEtapa.cambiar('fecha_inicio_programada', e.target.value)} />
            </div>
            <div>
              <label htmlFor="e-fin" className="label">Fin programado</label>
              <input id="e-fin" type="date" className="input" required value={nuevaEtapa.valores.fecha_fin_programada}
                min={nuevaEtapa.valores.fecha_inicio_programada || proyDesde || undefined} max={proyHasta || undefined}
                onChange={(e) => nuevaEtapa.cambiar('fecha_fin_programada', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            El orden se asigna solo según la fecha de inicio, y las fechas no pueden solaparse con las de otra etapa.
          </p>
          <div className="flex items-center gap-3">
            <AlertaFormulario mensaje={nuevaEtapa.error} />
            <button type="submit" className="btn-primary disabled:opacity-60" disabled={nuevaEtapa.guardando}>Registrar etapa</button>
            <button type="button" className="btn-ghost"
              onClick={nuevaEtapa.cerrar}>Cancelar</button>
          </div>
        </form>
      )}

      {(vista === 'cronograma' || vista === 'etapas') && etapas.length === 0 && etapasBaja.length === 0 && (
        <div className="card px-6 py-14 text-center text-sm text-slate-500">
          Este proyecto aún no tiene etapas. {puedeEtapas && 'Defina la primera con «Nueva etapa».'}
          {puedeBajaEtapas && (
            <button type="button" className="btn-ghost ml-2 !px-3 !py-1.5 text-xs" onClick={() => { setVerBajas(true); irA('etapas') }}>Ver etapas dadas de baja</button>
          )}
        </div>
      )}

      {/* Resumen del proyecto: avance, presupuesto por etapa y plazo. */}
      {vista === 'resumen' && proyecto && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card flex items-center gap-5 p-5">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#eab308" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - avanceProyecto / 100)} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-xl font-extrabold text-slate-900">{avanceProyecto}%</span>
            </div>
            <div className="min-w-0 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avance del proyecto</p>
              <p className="mt-1 font-semibold text-slate-900">Ponderado por esfuerzo</p>
              <p className="mt-1 text-xs text-slate-500">
                {actividades.filter((a) => a.estado === 'COMPLETADA').length} de {actividades.length} actividades finalizadas
              </p>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Presupuesto</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900" title={fmtCOP(proyecto.presupuesto_inicial)}>
              {fmtCOPCompacto(proyecto.presupuesto_inicial)}
            </p>
            <div className="mt-2 flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100">
              {etapas.map((et, i) => (
                <span key={et.id} title={`${et.nombre}: ${fmtCOP(et.presupuesto ?? 0)}`}
                  style={{ width: `${Math.min(100, (Number(et.presupuesto ?? 0) / (Number(proyecto.presupuesto_inicial) || 1)) * 100)}%`, background: colorEtapa(i) }} />
              ))}
            </div>
            <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto pr-1 text-xs text-slate-600">
              {etapas.map((et, i) => (
                <li key={et.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorEtapa(i) }} />
                    <span className="truncate">{et.orden}. {et.nombre}</span>
                  </span>
                  <b className="shrink-0 text-slate-800" title={fmtCOP(et.presupuesto ?? 0)}>{fmtCOPCompacto(et.presupuesto ?? 0)}</b>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-dashed border-slate-200 pt-2 text-xs text-slate-600">
              <span>Sin asignar a actividades</span>
              <b className="text-slate-800" title={fmtCOP(Math.max(0, Number(proyecto.presupuesto_inicial) - presupuestoAsignado))}>
                {fmtCOPCompacto(Math.max(0, Number(proyecto.presupuesto_inicial) - presupuestoAsignado))}
              </b>
            </p>
          </div>

          <div className="card space-y-3 p-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plazo y alertas</p>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600"><CalendarDaysIcon className="h-5 w-5" /></span>
              <div>
                <p className="font-bold text-slate-900">{diasRestantes >= 0 ? `${diasRestantes} días para la entrega` : `Plazo vencido hace ${-diasRestantes} días`}</p>
                <p className="text-xs text-slate-500">{fmtFecha(proyecto.fecha_inicio_programada)} — {fmtFecha(proyecto.fecha_fin_programada)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${atrasadas + conIncidencia.size ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <ExclamationTriangleIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-slate-900">{atrasadas} {atrasadas === 1 ? 'atrasada' : 'atrasadas'} · {conIncidencia.size} {conIncidencia.size === 1 ? 'incidencia grave' : 'incidencias graves'}</p>
                <p className="text-xs text-slate-500">{atrasadas + conIncidencia.size ? 'Abra la actividad marcada para actuar.' : 'Sin alertas por ahora.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {vista === 'cronograma' && etapas.length > 0 && (
        <CronogramaPlan
          proyecto={proyecto}
          etapas={etapas}
          actividades={actividades}
          conIncidencia={conIncidencia}
          estadoVisible={estadoVisible}
          etiquetas={ESTADO_ETIQUETA}
          insignias={ESTADO_BADGE}
          orden={ordenActs}
          onOrden={setOrdenActs}
          ordenarActividades={(filas) => ordenarFilas(filas, ordenActs, CLAVES_ACTIVIDAD)}
          panelActividad={(a, cerrar) => {
            const accion = (fn) => () => { cerrar(); fn() }
            return (
              <>
                {puedeAvance(a) && a.estado === 'PENDIENTE' && (
                  <button type="button" disabled={cambiandoEstado === a.id}
                    className="btn-primary justify-center disabled:opacity-60" onClick={accion(() => cambiarEstado(a))}>
                    <PlayIcon className="h-4 w-4" /> Empezar actividad
                  </button>
                )}
                {puedeAvance(a) && (
                  <button type="button" className="btn-ghost justify-start" onClick={accion(() => setPorAvanzar(a))}>
                    <ClipboardDocumentCheckIcon className="h-5 w-5 text-emerald-600" /> Registrar avance
                  </button>
                )}
                <button type="button" className="btn-ghost justify-start" onClick={accion(() => setFichaVer({ tipo: 'actividad', dato: a }))}>
                  <EyeIcon className="h-5 w-5 text-slate-500" /> Ver ficha
                </button>
                {puedeEditarActividades && (
                  <button type="button" className="btn-ghost justify-start" onClick={accion(() => abrirEdicionActividad(a))}>
                    <PencilSquareIcon className="h-5 w-5 text-sky-600" /> Editar
                  </button>
                )}
                {puedeReprogramarActividades && a.estado !== 'COMPLETADA' && (
                  <button type="button" className="btn-ghost justify-start" onClick={accion(() => abrirReprogramacion('actividad', a))}>
                    <ArrowPathIcon className="h-5 w-5 text-amber-600" /> Reprogramar
                  </button>
                )}
                <button type="button" className="btn-ghost justify-start" onClick={accion(() => setPresupuestando(a))}>
                  <CubeIcon className="h-5 w-5 text-slate-500" /> Presupuesto de materiales
                </button>
              </>
            )
          }}
        />
      )}

      {vista === 'etapas' && (etapas.length > 0 || etapasBaja.length > 0) && (
        <GestionEtapas
          etapas={etapas}
          bajas={etapasBaja}
          actividades={actividades}
          conIncidencia={conIncidencia}
          estadoVisible={estadoVisible}
          etiquetas={ESTADO_ETIQUETA}
          insignias={ESTADO_BADGE}
          ordenarActividades={(filas) => ordenarFilas(filas, ordenActs, CLAVES_ACTIVIDAD)}
          onFichaActividad={(a) => setFichaVer({ tipo: 'actividad', dato: a })}
          verBajas={verBajas}
          onVerBajas={puedeBajaEtapas ? () => setVerBajas((v) => !v) : undefined}
          principalEtapa={(et) =>
            puedeActividades && (
              <button type="button" title="Agregar actividad a esta etapa" className="btn-accion btn-accion-ok"
                onClick={() => nuevaActividad.abrir(ACTIVIDAD_VACIA, et.id)}>
                <PlusIcon className="h-3.5 w-3.5" /> Actividad
              </button>
            )
          }
          itemsEtapa={(et) => [
            { label: 'Ver ficha', icono: EyeIcon, onClick: () => setFichaVer({ tipo: 'etapa', dato: et }) },
            puedeEditarEtapas && { label: 'Editar', icono: PencilSquareIcon, onClick: () => abrirEdicionEtapa(et) },
            puedeEditarEtapas && et.estado === 'PENDIENTE' && { label: 'Empezar etapa', icono: PlayIcon, deshabilitado: cambiandoEstado === `e${et.id}`, onClick: () => empezarEtapa(et) },
            puedeReprogramarEtapas && et.estado !== 'COMPLETADA' && et.fecha_inicio_programada && et.fecha_fin_programada && { label: 'Reprogramar', icono: ArrowPathIcon, onClick: () => abrirReprogramacion('etapa', et) },
            puedeBajaEtapas && { label: 'Dar de baja', icono: TrashIcon, peligro: true, onClick: () => setEtapaPorBaja(et) },
          ]}
          itemsBaja={(et) => [
            { label: 'Ver ficha', icono: EyeIcon, onClick: () => setFichaVer({ tipo: 'etapa', dato: et }) },
            puedeBajaEtapas && {
              label: 'Reactivar etapa', icono: ArrowUturnLeftIcon,
              onClick: () => ejecutar(() => etapasApi.reactivar(et.id), { exito: `Etapa «${et.nombre}» reactivada.`, error: 'No se pudo reactivar la etapa.' }),
            },
          ]}
          rapidaActividad={(a) =>
            puedeAvance(a) && a.estado === 'PENDIENTE' ? (
              <button type="button" title="Empezar la actividad (registra la fecha real de inicio)" disabled={cambiandoEstado === a.id}
                className="btn-accion btn-accion-plan disabled:opacity-60" onClick={() => cambiarEstado(a)}>
                <PlayIcon className="h-3.5 w-3.5" /> Empezar
              </button>
            ) : puedeAvance(a) ? (
              <button type="button" title="Registrar avance" aria-label="Registrar avance" className="btn-accion btn-accion-ok" onClick={() => setPorAvanzar(a)}>
                <ClipboardDocumentCheckIcon className="h-4 w-4" />
              </button>
            ) : null
          }
          itemsActividad={(a) => [
            puedeAvance(a) && a.estado === 'PENDIENTE' && { label: 'Registrar avance', icono: ClipboardDocumentCheckIcon, onClick: () => setPorAvanzar(a) },
            { label: 'Ver ficha', icono: EyeIcon, onClick: () => setFichaVer({ tipo: 'actividad', dato: a }) },
            puedeEditarActividades && { label: 'Editar', icono: PencilSquareIcon, onClick: () => abrirEdicionActividad(a) },
            puedeReprogramarActividades && a.estado !== 'COMPLETADA' && { label: 'Reprogramar', icono: ArrowPathIcon, onClick: () => abrirReprogramacion('actividad', a) },
            { label: 'Presupuesto de materiales', icono: CubeIcon, onClick: () => setPresupuestando(a) },
          ]}
          barra={
            <>
              {puedeEtapas && (
                <button type="button" className="btn-primary !py-2 text-sm" onClick={() => (nuevaEtapa.abierto ? nuevaEtapa.cerrar() : nuevaEtapa.abrir())}>
                  <PlusIcon className="h-5 w-5" /> Nueva etapa
                </button>
              )}
              {puedeAplicarPlantilla && (
                <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => setPlantillaAbierta(true)}>Aplicar plantilla</button>
              )}
            </>
          }
        />
      )}

      {/* Nueva actividad: ventana con el formulario (antes se abría dentro de la etapa). */}
      <ModalFormulario
        {...nuevaActividad.propsModal}
        abierto={nuevaActividad.abierto && puedeActividades}
        titulo="Nueva actividad"
        subtitulo={etapaNueva?.nombre}
        textoGuardar="Registrar actividad"
      >
        {etapaNueva && (
          <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`a-nombre-${actividadEn}`} className="label">Nombre de la actividad</label>
                  <input id={`a-nombre-${actividadEn}`} className="input" value={nuevaActividad.valores.nombre}
                    onChange={(e) => nuevaActividad.cambiar('nombre', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor={`a-resp-${actividadEn}`} className="label">Responsable</label>
                  <BuscadorSelect
                    id={`a-resp-${actividadEn}`}
                    value={nuevaActividad.valores.responsable_id}
                    onChange={(v) => nuevaActividad.cambiar('responsable_id', v)}
                    opciones={[
                      { value: '', label: 'Sin asignar' },
                      ...miembrosPara().map((t) => ({
                        value: t.id,
                        label: `${t.nombres} ${t.apellidos}`,
                        sublabel: [t.cargo, t.especialidad].filter(Boolean).join(' · '),
                      })),
                    ]}
                    vacio="Sin asignar"
                    placeholder="Escriba el nombre del responsable…"
                  />
                </div>
                <div>
                  <label htmlFor={`a-inicio-${actividadEn}`} className="label">Inicio programado</label>
                  <input id={`a-inicio-${actividadEn}`} type="date" className="input" value={nuevaActividad.valores.fecha_inicio_programada}
                    min={limiteEtapa(etapaNueva).min || undefined} max={nuevaActividad.valores.fecha_fin_programada || limiteEtapa(etapaNueva).max || undefined}
                    onChange={(e) => nuevaActividad.cambiar('fecha_inicio_programada', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor={`a-fin-${actividadEn}`} className="label">Fin programado</label>
                  <input id={`a-fin-${actividadEn}`} type="date" className="input" value={nuevaActividad.valores.fecha_fin_programada}
                    min={nuevaActividad.valores.fecha_inicio_programada || limiteEtapa(etapaNueva).min || undefined} max={limiteEtapa(etapaNueva).max || undefined}
                    onChange={(e) => nuevaActividad.cambiar('fecha_fin_programada', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor={`a-esfuerzo-${actividadEn}`} className="label">Esfuerzo</label>
                  <select id={`a-esfuerzo-${actividadEn}`} className="input" value={nuevaActividad.valores.esfuerzo}
                    onChange={(e) => nuevaActividad.cambiar('esfuerzo', e.target.value)}>
                    {ESFUERZOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Pondera la actividad en el avance de la etapa y del proyecto.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`a-presupuesto-${actividadEn}`} className="label">Presupuesto (COP, opcional)</label>
                  <input id={`a-presupuesto-${actividadEn}`} type="text" inputMode="numeric" autoComplete="off" className="input tabular-nums"
                    placeholder="10.000.000" value={fmtMiles(nuevaActividad.valores.presupuesto)}
                    onChange={(e) => nuevaActividad.cambiar('presupuesto', soloDigitos(e.target.value).slice(0, 13))} />
                  <p className="mt-1 text-xs text-slate-500">
                    Si lo define, el sistema advierte cuando un servicio externo lo excede.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="label">Criterios de aceptación</span>
                  <div className="space-y-2">
                    {nuevaActividad.valores.criterios.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="checkbox" disabled aria-hidden="true" className="h-4 w-4" />
                        <input className="input" maxLength={200} placeholder={`Criterio ${i + 1}`} aria-label={`Criterio de aceptación ${i + 1}`}
                          value={c}
                          onChange={(e) => nuevaActividad.cambiar('criterios', nuevaActividad.valores.criterios.map((x, k) => (k === i ? e.target.value : x)))} />
                        {nuevaActividad.valores.criterios.length > 1 && (
                          <button type="button" className="btn-ghost" aria-label={`Quitar criterio ${i + 1}`}
                            onClick={() => nuevaActividad.cambiar('criterios', nuevaActividad.valores.criterios.filter((_, k) => k !== i))}>
                            Quitar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {nuevaActividad.valores.criterios.length < 20 && (
                    <button type="button" className="btn-ghost mt-2"
                      onClick={() => nuevaActividad.cambiar('criterios', [...nuevaActividad.valores.criterios, ''])}>
                      + Agregar criterio
                    </button>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    El avance se calcula de forma equitativa según los criterios cumplidos.
                  </p>
                </div>
          </div>
        )}
      </ModalFormulario>

      {/* RBAC: gestión de acceso al proyecto. Solo quien puede administrarlo ve
          el formulario; los demás roles no necesitan esta caja. */}
      {vista === 'acceso' && puedeAcceso && proyecto && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Acceso al proyecto</h3>
              <p className="text-xs text-slate-500">
                Quién puede consultar este proyecto y sus actividades: solo las asignaciones vigentes dan acceso.
              </p>
            </div>
            <span className="badge bg-slate-100 text-slate-600">
              {asignaciones.filter((a) => a.estado === 'ACTIVO').length} con acceso vigente
            </span>
          </div>

          <Retractil titulo="Asignar acceso" icono={UserPlusIcon}>
          <form onSubmit={acceso.guardar} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label htmlFor="ac-trabajador" className="label">Trabajador</label>
              <BuscadorSelect
                id="ac-trabajador"
                value={accesoForm.trabajador_id}
                onChange={(v) => acceso.cambiar('trabajador_id', v)}
                opciones={responsables.map((t) => ({
                  value: t.id,
                  label: `${t.nombres} ${t.apellidos}`,
                  sublabel: [t.cargo, t.especialidad].filter(Boolean).join(' · '),
                }))}
                placeholder="Escriba el nombre del trabajador…"
                requerido
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-2">
              <label htmlFor="ac-descripcion" className="label">Descripción de la asignación</label>
              <textarea
                id="ac-descripcion"
                maxLength={5000}
                rows={2}
                className="input"
                placeholder="Residente de obra, apoyo en cimentación…"
                value={accesoForm.observaciones}
                onChange={(e) => acceso.cambiar('observaciones', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ac-actividad" className="label">Actividad (opcional)</label>
              <select
                id="ac-actividad"
                className="input"
                value={accesoForm.actividad_id}
                onChange={(e) => acceso.cambiar('actividad_id', e.target.value)}
              >
                <option value="">Todo el proyecto</option>
                {etapas.map((et) => {
                  const delaEtapa = actividades.filter((a) => a.etapa_id === et.id)
                  if (delaEtapa.length === 0) return null
                  return (
                    <optgroup key={et.id} label={`${et.orden}. ${et.nombre}`}>
                      {delaEtapa.map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            </div>
            <div>
              <label htmlFor="ac-inicio" className="label">Inicio</label>
              <input
                id="ac-inicio"
                type="date"
                className="input"
                required
                value={accesoForm.fecha_inicio}
                onChange={(e) => acceso.cambiar('fecha_inicio', e.target.value)}
              />
              <SugerenciaFecha
                dia={sugerenciaAcceso.inicio}
                origen={sugerenciaAcceso.origen('inicio')}
                actual={accesoForm.fecha_inicio}
                onUsar={(dia) => acceso.cambiar('fecha_inicio', dia)}
              />
            </div>
            <div>
              <label htmlFor="ac-fin" className="label">Fin programado (opcional)</label>
              <input
                id="ac-fin"
                type="date"
                className="input"
                value={accesoForm.fecha_fin_programada}
                onChange={(e) => acceso.cambiar('fecha_fin_programada', e.target.value)}
              />
              <SugerenciaFecha
                dia={sugerenciaAcceso.fin}
                origen={sugerenciaAcceso.origen('fin')}
                actual={accesoForm.fecha_fin_programada}
                onUsar={(dia) => acceso.cambiar('fecha_fin_programada', dia)}
              />
            </div>
            <div className="flex items-end xl:col-span-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={acceso.guardando || !accesoForm.trabajador_id}
              >
                {acceso.guardando ? 'Asignando…' : 'Dar acceso'}
              </button>
            </div>
            {acceso.error && (
              <div className="sm:col-span-2 xl:col-span-4">
                <AlertaFormulario mensaje={acceso.error} />
              </div>
            )}
          </form>
          </Retractil>

          <Retractil
            titulo="Buscar y filtrar"
            icono={FunnelIcon}
            insignia={filtrosActivos > 0 ? `${filtrosActivos} ${filtrosActivos === 1 ? 'filtro' : 'filtros'}` : null}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="sm:col-span-2 xl:col-span-4">
                <label htmlFor="fa-buscar" className="label">Buscar</label>
                <input
                  id="fa-buscar"
                  className="input"
                  placeholder="Nombre, cargo, descripción o actividad…"
                  value={filtroAcceso.buscar}
                  onChange={(e) => filtrosAcceso.cambiar('buscar', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="fa-estado" className="label">Estado</label>
                <select id="fa-estado" className="input" value={filtroAcceso.estado}
                  onChange={(e) => filtrosAcceso.cambiar('estado', e.target.value)}>
                  <option value="">Todos</option>
                  <option value="ACTIVO">Vigente</option>
                  <option value="FINALIZADO">Finalizado</option>
                  <option value="REASIGNADO">Reasignado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
              <div>
                <label htmlFor="fa-alcance" className="label">Alcance</label>
                <select id="fa-alcance" className="input" value={filtroAcceso.alcance}
                  onChange={(e) => filtrosAcceso.cambiar('alcance', e.target.value)}>
                  <option value="">Todos</option>
                  <option value="PROYECTO">Todo el proyecto</option>
                  <option value="ACTIVIDAD">Por actividad</option>
                </select>
              </div>
              <div>
                <label htmlFor="fa-actividad" className="label">Actividad</label>
                <select id="fa-actividad" className="input" value={filtroAcceso.actividad}
                  onChange={(e) => filtrosAcceso.cambiar('actividad', e.target.value)}>
                  <option value="">Todas</option>
                  {etapas.map((et) => {
                    const delaEtapa = actividades.filter((a) => a.etapa_id === et.id)
                    if (delaEtapa.length === 0) return null
                    return (
                      <optgroup key={et.id} label={`${et.orden}. ${et.nombre}`}>
                        {delaEtapa.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
                      </optgroup>
                    )
                  })}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={filtroAcceso.vencen}
                  onChange={(e) => filtrosAcceso.cambiar('vencen', e.target.checked)} />
                Vencen en los próximos {DIAS_POR_VENCER} días
              </label>
              <div className="flex items-center justify-end sm:col-span-2">
                <button type="button" className="btn-ghost" disabled={filtrosActivos === 0}
                  onClick={filtrosAcceso.limpiar}>
                  Limpiar filtros
                </button>
              </div>
            </div>
          </Retractil>

          {asignaciones.length === 0 ? (
            <p className="px-5 py-4 text-xs text-slate-400">
              Todavía no hay asignaciones. El responsable del proyecto y quien tenga alcance total
              siempre lo ven.
            </p>
          ) : asignacionesFiltradas.length === 0 ? (
            <p className="px-5 py-4 text-xs text-slate-400">Ningún acceso coincide con los filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    {['Trabajador', 'Cargo', 'Alcance', 'Estado'].map((t) => (
                      <EncabezadoOrdenable key={t} titulo={t} orden={ordenGrupos} className="px-5 py-3"
                        onOrden={(x) => setOrdenGrupos((o) => alternarOrden(o, x))} />
                    ))}
                    <th className="px-5 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordenarFilas(gruposAcceso, ordenGrupos, CLAVES_GRUPOS).map((g) => (
                    <tr key={g.trabajador_id}>
                      <td className="px-5 py-3 font-medium text-slate-800">{g.trabajador_nombre}</td>
                      <td className="px-5 py-3 text-slate-600">{g.cargo ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-600">{g.alcance}</td>
                      <td className="px-5 py-3">
                        <span className={`badge badge-tabla ${ESTADO_ASIGNACION[g.estado] ?? 'bg-slate-100 text-slate-600'}`}>{g.estado}</span>
                      </td>
                      <td className="px-5 py-3">
                        <button type="button" className="btn-accion" onClick={() => setGrupoAbierto(g.trabajador_id)}>
                          Ver asignaciones ({g.filas.length})
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Asignaciones del trabajador (acceso general y actividades) con sus acciones. */}
      <Modal abierto={Boolean(grupoElegido)} titulo={grupoElegido?.trabajador_nombre ?? ''}
        subtitulo="Acceso al proyecto y actividades asignadas" ancho="max-w-5xl" onCerrar={() => setGrupoAbierto(null)}>
        <div className="overflow-x-auto">
    <table className="w-full min-w-[720px] text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          {['Descripción de la asignación', 'Actividad', 'Vigencia', 'Estado'].map((t) => (
            <EncabezadoOrdenable key={t} titulo={t} orden={ordenAcceso} className="px-5 py-3"
              onOrden={(x) => setOrdenAcceso((o) => alternarOrden(o, x))} />
          ))}
          <th className="px-5 py-3 font-semibold">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {ordenarFilas(filasDelGrupo, ordenAcceso, CLAVES_ACCESO).map((a) => (
          <tr key={a.id}>
            <td className="px-5 py-3 text-slate-600 md:w-[9.25rem] md:min-w-[9.25rem] md:max-w-[9.25rem]">
              <DescripcionCopiable texto={a.observaciones} />
            </td>
            <td className="px-5 py-3 text-slate-600">
              {a.actividad_nombre ?? 'Todo el proyecto'}
            </td>
            <td className="px-5 py-3 text-xs text-slate-500">
              {fmtFecha(a.fecha_inicio)}
              {a.fecha_fin_programada ? ` — ${fmtFecha(a.fecha_fin_programada)}` : ''}
              {a.fecha_fin_real && (
                <span className="block text-slate-400">Terminó el {fmtFecha(a.fecha_fin_real)}</span>
              )}
            </td>
            <td className="px-5 py-3">
              <span
                className={`badge badge-tabla ${
                  ESTADO_ASIGNACION[a.estado] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                {a.estado}
              </span>
            </td>
            <td className="px-5 py-3">
              {a.estado === 'ACTIVO' ? (
                <div className="flex flex-col items-stretch gap-1.5">
                  <button
                    type="button"
                    className="btn-accion btn-accion-peligro"
                    onClick={() => finalizarAsignacion(a)}
                  >
                    Finalizar acceso
                  </button>
                  <button type="button" className="btn-accion" onClick={() => cancelarAsignacion(a)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-accion" onClick={() => setPorExtender(a)}>
                    {puedeExtender ? 'Extender' : 'Historial'}
                  </button>
                </div>
              ) : (
                <button type="button" className="btn-accion" onClick={() => setPorExtender(a)}>
                  Historial
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
      </Modal>

      <ExtenderAsignacion
        asignacion={porExtender}
        soloLectura={!puedeExtender}
        onCerrar={() => setPorExtender(null)}
        onExtendida={(mensaje) => { setAviso(mensaje); recargar() }}
      />

      {/* HU-08: cantidades por material contra las que se valida cada solicitud. */}
      {presupuestando && (
        <PresupuestoMateriales
          actividad={presupuestando}
          editable={puedeEditarActividades}
          onCerrar={() => setPresupuestando(null)}
          onGuardado={() => {
            setAviso('Presupuesto de materiales actualizado.')
            setPresupuestando(null)
          }}
        />
      )}

      {/* HU-21: registro del porcentaje de avance e historial de la actividad. */}
      {porAvanzar && (
        <RegistrarAvance
          actividad={porAvanzar}
          onCerrar={() => setPorAvanzar(null)}
          onRegistrado={(mensaje) => {
            setAviso(mensaje)
            setPorAvanzar(null)
            return recargar()
          }}
        />
      )}

      {/* Ficha de solo lectura: todos los atributos de la etapa o actividad. */}
      {fichaVer && (
        <Ficha
          titulo={fichaVer.dato.nombre}
          subtitulo={fichaVer.tipo === 'etapa' ? `Etapa ${fichaVer.dato.orden}` : `Actividad · ${fichaVer.dato.etapa_nombre ?? ''}`}
          onCerrar={() => setFichaVer(null)}
          campos={[
            ['Descripción', fichaVer.dato.descripcion],
            ...(fichaVer.tipo === 'actividad' ? [['Responsable', fichaVer.dato.responsable_nombre]] : []),
            ['Inicio programado', fichaVer.dato.fecha_inicio_programada ? fmtFecha(fichaVer.dato.fecha_inicio_programada) : null],
            ['Fin programado', fichaVer.dato.fecha_fin_programada ? fmtFecha(fichaVer.dato.fecha_fin_programada) : null],
            ['Inicio real', fichaVer.dato.fecha_inicio_real ? fmtFecha(fichaVer.dato.fecha_inicio_real) : null],
            ['Fin real', fichaVer.dato.fecha_fin_real ? fmtFecha(fichaVer.dato.fecha_fin_real) : null],
            ['Estado', ESTADO_ETIQUETA[fichaVer.tipo === 'actividad' ? estadoVisible(fichaVer.dato) : fichaVer.dato.estado]],
            ['Avance', fichaVer.dato.porcentaje_avance != null ? `${Number(fichaVer.dato.porcentaje_avance)}%` : null],
            ['Esfuerzo', fichaVer.tipo === 'actividad' ? `${etiquetaEsfuerzo(fichaVer.dato.esfuerzo)} (peso ${Number(fichaVer.dato.peso)})` : null],
            ['Presupuesto', fichaVer.dato.presupuesto != null ? fmtCOP(fichaVer.dato.presupuesto) : null],
            ['Criterios cumplidos', fichaVer.tipo === 'actividad' && fichaVer.dato.total_criterios ? `${fichaVer.dato.criterios_cumplidos} de ${fichaVer.dato.total_criterios}` : null],
          ]}
        />
      )}

      {/* Edición de etapa o actividad en una ventana; el error de negocio va dentro. */}
      <ModalFormulario
        {...edicion.propsModal}
        titulo={editandoEtapa ? 'Editar etapa' : 'Editar actividad'}
        subtitulo={editandoEtapa?.nombre ?? editandoActividad?.nombre}
      >
        {(editandoEtapa || editandoActividad) && (() => {
          const lim = editandoEtapa
            ? { min: soloDia(proyecto?.fecha_inicio_programada), max: soloDia(proyecto?.fecha_fin_programada) }
            : limiteEtapa(etapas.find((x) => x.id === editandoActividad.etapa_id) ?? {})
          const marca = (campo) => (edicion.campo === campo ? ' border-red-400' : '')
          return (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ed-nombre" className="label">Nombre</label>
                <input id="ed-nombre" className={`input${marca('nombre')}`} maxLength={editandoEtapa ? 100 : 150}
                  value={edicion.valores.nombre} required
                  onChange={(e) => edicion.cambiar('nombre', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ed-descripcion" className="label">Descripción</label>
                <textarea id="ed-descripcion" rows={2} className={`input${marca('descripcion')}`}
                  value={edicion.valores.descripcion}
                  onChange={(e) => edicion.cambiar('descripcion', e.target.value)} />
              </div>
              {editandoActividad && (
                <div className="sm:col-span-2">
                  <label htmlFor="ed-resp" className="label">Responsable</label>
                  <BuscadorSelect
                    id="ed-resp"
                    value={edicion.valores.responsable_id}
                    onChange={(v) => edicion.cambiar('responsable_id', v)}
                    opciones={[
                      { value: '', label: 'Sin asignar' },
                      ...miembrosPara(edicion.valores.responsable_id).map((t) => ({
                        value: t.id,
                        label: `${t.nombres} ${t.apellidos}`,
                        sublabel: [t.cargo, t.especialidad].filter(Boolean).join(' · '),
                      })),
                    ]}
                    vacio="Sin asignar"
                    placeholder="Escriba el nombre del responsable…"
                  />
                </div>
              )}
              <div>
                <label htmlFor="ed-inicio" className="label">Inicio programado</label>
                <input id="ed-inicio" type="date" required disabled={fechasFijas(edicion.registro?.dato)}
                  className={`input${marca('fecha_inicio_programada')}`}
                  value={edicion.valores.fecha_inicio_programada} min={lim.min} max={lim.max}
                  onChange={(e) => edicion.cambiar('fecha_inicio_programada', e.target.value)} />
              </div>
              <div>
                <label htmlFor="ed-fin" className="label">Fin programado</label>
                <input id="ed-fin" type="date" required disabled={fechasFijas(edicion.registro?.dato)}
                  className={`input${marca('fecha_fin_programada')}`}
                  value={edicion.valores.fecha_fin_programada}
                  min={edicion.valores.fecha_inicio_programada || lim.min} max={lim.max}
                  onChange={(e) => edicion.cambiar('fecha_fin_programada', e.target.value)} />
              </div>
              {editandoActividad && (
                <div>
                  <label htmlFor="ed-esfuerzo" className="label">Esfuerzo</label>
                  <select id="ed-esfuerzo" className={`input${marca('esfuerzo')}`} value={edicion.valores.esfuerzo ?? 'MEDIO'}
                    onChange={(e) => edicion.cambiar('esfuerzo', e.target.value)}>
                    {ESFUERZOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Pondera la actividad en el avance de la etapa y del proyecto.
                  </p>
                </div>
              )}
              {editandoActividad && (
                <div className="sm:col-span-2">
                  <label htmlFor="ed-presupuesto" className="label">Presupuesto (COP, opcional)</label>
                  <input id="ed-presupuesto" type="text" inputMode="numeric" autoComplete="off"
                    className={`input tabular-nums${marca('presupuesto')}`} placeholder="10.000.000"
                    value={fmtMiles(edicion.valores.presupuesto ?? '')}
                    onChange={(e) => edicion.cambiar('presupuesto', soloDigitos(e.target.value).slice(0, 13))} />
                  <p className="mt-1 text-xs text-slate-500">
                    Referencia para advertir cuando un servicio externo la excede; vacío = sin presupuesto. Las cantidades de materiales se definen en «Presupuesto de materiales».
                  </p>
                </div>
              )}
              <p className="text-xs text-slate-500 sm:col-span-2">
                {fechasFijas(edicion.registro?.dato)
                  ? 'Para cambiar las fechas use «Reprogramar»: conserva las originales y registra el motivo.'
                  : editandoEtapa
                    ? 'El orden se recalcula solo según la fecha de inicio; no puede solaparse con otra etapa ni dejar actividades fuera de sus fechas.'
                    : 'Las fechas deben quedar dentro de las de la etapa.'}
              </p>
            </div>
          )
        })()}
      </ModalFormulario>

      {/* HU-34: reprogramar fechas de una etapa o actividad; el motivo es obligatorio. */}
      <ModalFormulario
        {...reprogramacion.propsModal}
        titulo={reprogramandoEtapa ? 'Reprogramar etapa' : 'Reprogramar actividad'}
        subtitulo={reprogramandoEtapa?.nombre ?? reprogramandoActividad?.nombre}
        textoGuardar="Reprogramar"
      >
        {(reprogramandoEtapa || reprogramandoActividad) && (() => {
          const lim = reprogramandoEtapa
            ? { min: soloDia(proyecto?.fecha_inicio_programada), max: soloDia(proyecto?.fecha_fin_programada) }
            : limiteEtapa(etapas.find((x) => x.id === reprogramandoActividad.etapa_id) ?? {})
          const marca = (campo) => (reprogramacion.campo === campo ? ' border-red-400' : '')
          return (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="rp-motivo" className="label">Motivo de la reprogramación</label>
                <textarea id="rp-motivo" rows={2} required maxLength={500}
                  className={`input${marca('motivo')}`}
                  value={reprogramacion.valores.motivo}
                  onChange={(e) => reprogramacion.cambiar('motivo', e.target.value)} />
              </div>
              <div>
                <label htmlFor="rp-inicio" className="label">Nuevo inicio</label>
                <input id="rp-inicio" type="date" required className={`input${marca('fecha_inicio_programada')}`}
                  value={reprogramacion.valores.fecha_inicio_programada} min={lim.min} max={lim.max}
                  onChange={(e) => reprogramacion.cambiar('fecha_inicio_programada', e.target.value)} />
              </div>
              <div>
                <label htmlFor="rp-fin" className="label">Nuevo fin</label>
                <input id="rp-fin" type="date" required className={`input${marca('fecha_fin_programada')}`}
                  value={reprogramacion.valores.fecha_fin_programada}
                  min={reprogramacion.valores.fecha_inicio_programada || lim.min} max={lim.max}
                  onChange={(e) => reprogramacion.cambiar('fecha_fin_programada', e.target.value)} />
              </div>
              {requiereConfirmacion && (
                <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 sm:col-span-2">
                  <input type="checkbox" className="mt-0.5"
                    checked={reprogramacion.valores.confirmar}
                    onChange={(e) => reprogramacion.cambiar('confirmar', e.target.checked)} />
                  <span>
                    Confirmo que también se reprograme el fin del proyecto. La fecha fin
                    original del proyecto se conserva.
                  </span>
                </label>
              )}
              <p className="text-xs text-slate-500 sm:col-span-2">
                Las fechas programadas originales se conservan; el cronograma vigente usa las nuevas.
              </p>
            </div>
          )
        })()}
      </ModalFormulario>

      <p className="text-xs text-slate-400">
        Las etapas no se solapan entre sí, y las fechas de cada actividad se limitan a las de su etapa y del proyecto.
      </p>
    </div>
  )
}
