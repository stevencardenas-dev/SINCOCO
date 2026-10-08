import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  FunnelIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import Retractil from '../components/Retractil.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
import PageHeader from '../components/PageHeader.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import Ficha from '../components/Ficha.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { proyectosApi } from '../services/proyectos'
import { etapasApi } from '../services/etapas'
import { actividadesApi } from '../services/actividades'
import { trabajadoresApi } from '../services/trabajadores'
import { asignacionesApi } from '../services/asignaciones'
import ExtenderAsignacion from '../components/ExtenderAsignacion.jsx'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'
import { mensajeError } from '../lib/errores.js'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-03 (RF03 · RF04): plan de trabajo de un proyecto. Define etapas y, dentro
 * de cada etapa, actividades con responsable y fechas. El backend valida que
 * las fechas queden dentro del rango del proyecto y que la etapa pertenezca al
 * proyecto.
 */

const ETAPA_VACIA = { nombre: '', descripcion: '', fecha_inicio_programada: '', fecha_fin_programada: '' }
const ACTIVIDAD_VACIA = { nombre: '', responsable_id: '', fecha_inicio_programada: '', fecha_fin_programada: '' }
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

export default function PlanProyecto() {
  const { id } = useParams()
  const { puede } = useAuth()
  // La interfaz sigue la matriz de permisos, no el nombre del rol.
  // Además del permiso del rol, el plan solo lo modifica el líder del proyecto,
  // el gerente y el administrador (`gestiona_plan`, que calcula el servidor).
  // Quien solo está asignado consulta el plan y actúa en lo suyo.
  const { datos, error, aviso, setAviso, recargar, ejecutar } = useRecurso(
    async () => {
      // Personal, asignaciones y acceso dependen de permisos que el rol puede no
      // tener: si fallan, el plan se muestra igual sin esa parte.
      const [proyectos, etapas, actividades, responsables, asignaciones, miAcceso] = await Promise.all([
        proyectosApi.listar(),
        etapasApi.listar({ proyecto_id: id }),
        actividadesApi.listar({ proyecto_id: id }),
        trabajadoresApi.listar().catch(() => []),
        asignacionesApi.listar({ proyecto_id: id }).catch(() => []),
        proyectosApi.miAcceso(id).catch(() => SIN_ACCESO),
      ])
      const proyecto = proyectos.find((x) => String(x.id) === String(id)) ?? null
      return { proyecto, etapas, actividades, responsables, asignaciones, miAcceso }
    },
    [id],
    { mensaje: 'No se pudo cargar el plan de trabajo.' },
  )
  const proyecto = datos?.proyecto ?? null
  const etapas = datos?.etapas ?? []
  const actividades = datos?.actividades ?? []
  const responsables = datos?.responsables ?? []
  const asignaciones = datos?.asignaciones ?? []
  const [porExtender, setPorExtender] = useState(null) // HU-31
  const miAcceso = datos?.miAcceso ?? SIN_ACCESO

  const gestionaPlan = miAcceso.gestiona_plan
  const puedeEtapas = gestionaPlan && puede('etapas.crear')
  const puedeActividades = gestionaPlan && puede('actividades.crear')
  const puedeEditarEtapas = gestionaPlan && puede('etapas.editar')
  const puedeEditarActividades = gestionaPlan && puede('actividades.editar')
  // «Registrar avance»: en cualquier actividad para quien gestiona el plan; si no, solo en las suyas.
  const puedeAvance = (a) => gestionaPlan || miAcceso.actividades_ids.includes(a.id)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)
  // «Registrar avance» aún no existe (HU-21): avisa con un mensaje flotante breve.
  const [proximamente, setProximamente] = useState(false)
  const avisarProximamente = () => {
    setProximamente(true)
    setTimeout(() => setProximamente(false), 1800)
  }
  const [fichaVer, setFichaVer] = useState(null) // { tipo: 'etapa' | 'actividad', dato }
  const puedeAcceso = puede('proyectos.gestionar_acceso')

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
      actividadesApi.crear({ ...f, etapa_id: etapaId, responsable_id: f.responsable_id || null }),
    alGuardar: () => {
      setAviso('Actividad registrada.')
      return recargar()
    },
    error: 'No se pudo registrar la actividad.',
  })
  const actividadEn = nuevaActividad.registro

  // Edición en ventana: `registro` es { tipo: 'etapa' | 'actividad', dato }.
  const edicion = useFormulario(ETAPA_VACIA, {
    enviar: (f, { tipo, dato }) =>
      tipo === 'etapa'
        ? etapasApi.actualizar(dato.id, f)
        : actividadesApi.actualizar(dato.id, { ...f, responsable_id: f.responsable_id || null }),
    alGuardar: (_, { registro }) => {
      setAviso(registro.tipo === 'etapa' ? 'Etapa actualizada.' : 'Actividad actualizada.')
      return recargar()
    },
    error: 'No se pudo guardar el cambio.',
  })
  const editandoEtapa = edicion.registro?.tipo === 'etapa' ? edicion.registro.dato : null
  const editandoActividad = edicion.registro?.tipo === 'actividad' ? edicion.registro.dato : null

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

  /** Rango permitido para las actividades de una etapa (por defecto, el del proyecto). */
  const limiteEtapa = (et) => ({
    min: soloDia(et.fecha_inicio_programada) || soloDia(proyecto?.fecha_inicio_programada),
    max: soloDia(et.fecha_fin_programada) || soloDia(proyecto?.fecha_fin_programada),
  })

  /** Retira el acceso vigente sin borrar la asignación (queda el historial). */
  const finalizarAsignacion = async (a) => {
    acceso.setError('')
    setAviso('')
    try {
      await asignacionesApi.actualizar(a.id, { estado: 'FINALIZADO' })
      setAviso(`${a.trabajador_nombre}: acceso finalizado.`)
      recargar()
    } catch (err) {
      acceso.setError(mensajeError(err, 'No se pudo finalizar la asignación.'))
    }
  }

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

  const abrirEdicionActividad = (a) =>
    edicion.abrir(
      {
        nombre: a.nombre,
        descripcion: a.descripcion ?? '',
        responsable_id: a.responsable_id ?? '',
        fecha_inicio_programada: soloDia(a.fecha_inicio_programada),
        fecha_fin_programada: soloDia(a.fecha_fin_programada),
      },
      { tipo: 'actividad', dato: a },
    )

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
      <Link to="/proyectos" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeftIcon className="h-4 w-4" /> Volver a proyectos
      </Link>

      <PageHeader accion={<BotonActualizar onClick={recargar} />}
        title={proyecto ? proyecto.nombre : `Proyecto #${id}`}
        subtitle={
          proyecto
            ? `${proyecto.codigo} · ${fmtFecha(proyecto.fecha_inicio_programada)} — ${fmtFecha(proyecto.fecha_fin_programada)}`
            : 'Plan de trabajo'
        }
      >
        {puedeEtapas && (
          <button className="btn-primary" onClick={() => (nuevaEtapa.abierto ? nuevaEtapa.cerrar() : nuevaEtapa.abrir())}>
            <PlusIcon className="h-5 w-5" /> Nueva etapa
          </button>
        )}
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {puedeEtapas && nuevaEtapa.abierto && (
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

      {etapas.length === 0 && (
        <div className="card px-6 py-14 text-center text-sm text-slate-500">
          Este proyecto aún no tiene etapas. {puedeEtapas && 'Defina la primera con «Nueva etapa».'}
        </div>
      )}

      {etapas.map((et) => {
        const acts = actividades.filter((a) => a.etapa_id === et.id)
        return (
          <div key={et.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-400 text-xs font-semibold text-brand-950 ring-1 ring-inset ring-accent-500/30">
                    {et.orden}
                  </span>
                  {et.nombre}
                </p>
                <p className="text-xs text-slate-400">
                  {et.fecha_inicio_programada ? fmtFecha(et.fecha_inicio_programada) : 'sin inicio'} —{' '}
                  {et.fecha_fin_programada ? fmtFecha(et.fecha_fin_programada) : 'sin fin'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${ESTADO_BADGE[et.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ESTADO_ETIQUETA[et.estado] ?? et.estado}
                </span>
                <button className="btn-ghost text-xs" onClick={() => setFichaVer({ tipo: 'etapa', dato: et })}>
                  <EyeIcon className="h-4 w-4" /> Ver ficha
                </button>
                {puedeEditarEtapas && (
                  <button className="btn-ghost text-xs" onClick={() => abrirEdicionEtapa(et)}>
                    <PencilSquareIcon className="h-4 w-4" /> Editar
                  </button>
                )}
                {puedeActividades && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => (actividadEn === et.id ? nuevaActividad.cerrar() : nuevaActividad.abrir(ACTIVIDAD_VACIA, et.id))}
                  >
                    <PlusIcon className="h-4 w-4" /> Actividad
                  </button>
                )}
              </div>
            </div>

            {puedeActividades && actividadEn === et.id && (
              <form onSubmit={nuevaActividad.guardar} className="grid gap-4 border-b border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2">
                <div>
                  <label htmlFor={`a-nombre-${et.id}`} className="label">Nombre de la actividad</label>
                  <input id={`a-nombre-${et.id}`} className="input" value={nuevaActividad.valores.nombre}
                    onChange={(e) => nuevaActividad.cambiar('nombre', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor={`a-resp-${et.id}`} className="label">Responsable</label>
                  <BuscadorSelect
                    id={`a-resp-${et.id}`}
                    value={nuevaActividad.valores.responsable_id}
                    onChange={(v) => nuevaActividad.cambiar('responsable_id', v)}
                    opciones={[
                      { value: '', label: 'Sin asignar' },
                      ...responsables.map((t) => ({
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
                  <label htmlFor={`a-inicio-${et.id}`} className="label">Inicio programado</label>
                  <input id={`a-inicio-${et.id}`} type="date" className="input" value={nuevaActividad.valores.fecha_inicio_programada}
                    min={limiteEtapa(et).min || undefined} max={nuevaActividad.valores.fecha_fin_programada || limiteEtapa(et).max || undefined}
                    onChange={(e) => nuevaActividad.cambiar('fecha_inicio_programada', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor={`a-fin-${et.id}`} className="label">Fin programado</label>
                  <input id={`a-fin-${et.id}`} type="date" className="input" value={nuevaActividad.valores.fecha_fin_programada}
                    min={nuevaActividad.valores.fecha_inicio_programada || limiteEtapa(et).min || undefined} max={limiteEtapa(et).max || undefined}
                    onChange={(e) => nuevaActividad.cambiar('fecha_fin_programada', e.target.value)} required />
                </div>
                <div className="sm:col-span-2">
                  <AlertaFormulario mensaje={nuevaActividad.error} />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button type="submit" className="btn-primary">Registrar actividad</button>
                  <button type="button" className="btn-ghost" onClick={nuevaActividad.cerrar}>Cancelar</button>
                </div>
              </form>
            )}

            {acts.length === 0 ? (
              <p className="px-5 py-4 text-xs text-slate-400">Sin actividades en esta etapa.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 font-semibold">Actividad</th>
                    <th className="px-3 py-2.5 font-semibold">Responsable</th>
                    <th className="px-3 py-2.5 font-semibold">Fechas</th>
                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                    <th className="px-3 py-2.5 font-semibold">Avance</th>
                    <th className="px-3 py-2.5 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {acts.map((a) => (
                    <tr key={a.id}>
                      <td className="max-w-[9rem] px-3 py-3 text-xs font-medium text-slate-700">{a.nombre}</td>
                      <td className="max-w-[7rem] px-3 py-3 text-xs text-slate-600">{a.responsable_nombre ?? '—'}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {fmtFecha(a.fecha_inicio_programada)} — {fmtFecha(a.fecha_fin_programada)}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`badge ${ESTADO_BADGE[estadoVisible(a)] ?? 'bg-slate-100 text-slate-600'}`}>
                          {ESTADO_ETIQUETA[estadoVisible(a)] ?? a.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold tabular-nums text-slate-600">
                        {Number(a.porcentaje_avance)}%
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button type="button" className="btn-accion btn-accion-editar"
                            onClick={() => setFichaVer({ tipo: 'actividad', dato: a })}>
                            <EyeIcon className="h-4 w-4" /> Ver ficha
                          </button>
                          {puedeEditarActividades && (
                            <button type="button" className="btn-accion btn-accion-editar" onClick={() => abrirEdicionActividad(a)}>
                              Editar
                            </button>
                          )}
                          {puedeAvance(a) && (a.estado === 'PENDIENTE' || a.estado === 'EN_PROCESO') && (
                            <button type="button" className="btn-accion btn-accion-editar"
                              disabled={cambiandoEstado === a.id}
                              onClick={() => cambiarEstado(a)}>
                              {a.estado === 'PENDIENTE'
                                ? <><PlayIcon className="h-4 w-4" /> Empezar</>
                                : <><CheckCircleIcon className="h-4 w-4" /> Finalizar</>}
                            </button>
                          )}
                          {puedeAvance(a) && (
                            <button type="button" className="btn-accion btn-accion-editar" onClick={avisarProximamente}>
                              <ClipboardDocumentCheckIcon className="h-4 w-4" /> Registrar avance
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )
      })}

      {/* RBAC: gestión de acceso al proyecto. Solo quien puede administrarlo ve
          el formulario; los demás roles no necesitan esta caja. */}
      {puedeAcceso && proyecto && (
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
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Trabajador</th>
                    <th className="px-5 py-3 font-semibold">Descripción de la asignación</th>
                    <th className="px-5 py-3 font-semibold">Actividad</th>
                    <th className="px-5 py-3 font-semibold">Vigencia</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {asignacionesFiltradas.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3 font-medium text-slate-800">{a.trabajador_nombre}</td>
                      <td className="px-5 py-3 text-slate-600 md:w-[9.25rem] md:min-w-[9.25rem] md:max-w-[9.25rem]">
                        <DescripcionCopiable texto={a.observaciones} />
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {a.actividad_nombre ?? 'Todo el proyecto'}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {fmtFecha(a.fecha_inicio)}
                        {a.fecha_fin_programada ? ` — ${fmtFecha(a.fecha_fin_programada)}` : ''}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge ${
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
                            <button type="button" className="btn-accion" onClick={() => setPorExtender(a)}>
                              Extender
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
          )}
        </div>
      )}

      <ExtenderAsignacion
        asignacion={porExtender}
        onCerrar={() => setPorExtender(null)}
        onExtendida={(mensaje) => { setAviso(mensaje); recargar() }}
      />

      {proximamente && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          <ClipboardDocumentCheckIcon className="h-5 w-5 text-accent-400" /> Próximamente
        </div>
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
                      ...responsables.map((t) => ({
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
                <input id="ed-inicio" type="date" required className={`input${marca('fecha_inicio_programada')}`}
                  value={edicion.valores.fecha_inicio_programada} min={lim.min} max={lim.max}
                  onChange={(e) => edicion.cambiar('fecha_inicio_programada', e.target.value)} />
              </div>
              <div>
                <label htmlFor="ed-fin" className="label">Fin programado</label>
                <input id="ed-fin" type="date" required className={`input${marca('fecha_fin_programada')}`}
                  value={edicion.valores.fecha_fin_programada}
                  min={edicion.valores.fecha_inicio_programada || lim.min} max={lim.max}
                  onChange={(e) => edicion.cambiar('fecha_fin_programada', e.target.value)} />
              </div>
              <p className="text-xs text-slate-500 sm:col-span-2">
                {editandoEtapa
                  ? 'El orden se recalcula solo según la fecha de inicio; no puede solaparse con otra etapa ni dejar actividades fuera de sus fechas.'
                  : 'Las fechas deben quedar dentro de las de la etapa.'}
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
