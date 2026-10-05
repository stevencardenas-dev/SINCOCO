import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeftIcon, ArrowPathIcon, FunnelIcon, PlusIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import Retractil from '../components/Retractil.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
import PageHeader from '../components/PageHeader.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'
import { mensajeError } from '../lib/errores.js'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-03 (RF03 · RF04): plan de trabajo de un proyecto. Define etapas y, dentro
 * de cada etapa, actividades con responsable y fechas. El backend valida que
 * las fechas queden dentro del rango del proyecto y que la etapa pertenezca al
 * proyecto.
 */

const ETAPA_VACIA = { nombre: '', descripcion: '', orden: '', fecha_inicio_programada: '', fecha_fin_programada: '' }
const ACTIVIDAD_VACIA = { nombre: '', responsable_id: '', fecha_inicio_programada: '', fecha_fin_programada: '' }
const ACCESO_VACIO = {
  trabajador_id: '',
  actividad_id: '',
  rol_en_proyecto: '',
  fecha_inicio: '',
  fecha_fin_programada: '',
}

const FILTRO_ACCESO_VACIO = { buscar: '', estado: '', alcance: '', rol: '', actividad: '', vencen: false }

// "Vencen pronto": asignaciones vigentes cuyo fin programado cae en este plazo.
const DIAS_POR_VENCER = 30

const ESTADO_ASIGNACION = {
  ACTIVO: 'bg-emerald-50 text-emerald-700',
  FINALIZADO: 'bg-slate-100 text-slate-600',
  REASIGNADO: 'bg-amber-50 text-amber-700',
}

const ESTADO_BADGE = {
  PENDIENTE: 'bg-slate-100 text-slate-600',
  EN_PROCESO: 'bg-sky-50 text-sky-700',
  COMPLETADA: 'bg-emerald-50 text-emerald-700',
  ATRASADA: 'bg-red-50 text-red-700',
  SUSPENDIDA: 'bg-amber-50 text-amber-700',
}

/** Fecha 'YYYY-MM-DD' (o ISO) -> 'YYYY-MM-DD', sin desplazarla por la zona horaria. */
const soloDia = (valor) => String(valor ?? '').slice(0, 10)

export default function PlanProyecto() {
  const { id } = useParams()
  const { puede } = useAuth()
  // La interfaz sigue la matriz de permisos, no el nombre del rol.
  const puedeEtapas = puede('etapas.crear')
  const puedeActividades = puede('actividades.crear')
  const puedeAcceso = puede('proyectos.gestionar_acceso')

  const [proyecto, setProyecto] = useState(null)
  const [etapas, setEtapas] = useState([])
  const [actividades, setActividades] = useState([])
  const [responsables, setResponsables] = useState([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [etapaForm, setEtapaForm] = useState(ETAPA_VACIA)
  const [abrirEtapa, setAbrirEtapa] = useState(false)
  const [actividadEn, setActividadEn] = useState(null)
  const [actividadForm, setActividadForm] = useState(ACTIVIDAD_VACIA)
  // Errores de negocio dentro de cada formulario, no sobre la tabla.
  const [errorEtapa, setErrorEtapa] = useState('')
  const [errorActividad, setErrorActividad] = useState('')
  // Gestión de acceso (RBAC): quién puede consultar este proyecto.
  const [asignaciones, setAsignaciones] = useState([])
  const [accesoForm, setAccesoForm] = useState(ACCESO_VACIO)
  const [errorAcceso, setErrorAcceso] = useState('')
  const [guardandoAcceso, setGuardandoAcceso] = useState(false)
  // Búsqueda y filtros del listado de acceso (se aplican en el cliente).
  const [filtroAcceso, setFiltroAcceso] = useState(FILTRO_ACCESO_VACIO)

  // Rango del proyecto: límite de las fechas de etapas y actividades (HU-03).
  const proyDesde = soloDia(proyecto?.fecha_inicio_programada)
  const proyHasta = soloDia(proyecto?.fecha_fin_programada)

  // Listado de acceso filtrado: texto libre y filtros combinados con "y".
  const rolesAcceso = [...new Set(asignaciones.map((a) => a.rol_en_proyecto).filter(Boolean))].sort()
  const filtrosActivos = Object.entries(filtroAcceso).filter(([, v]) => v !== '' && v !== false).length
  const asignacionesFiltradas = asignaciones.filter((a) => {
    const f = filtroAcceso
    const texto = [a.trabajador_nombre, a.rol_en_proyecto, a.actividad_nombre, a.cargo]
      .filter(Boolean).join(' ').toLowerCase()
    if (f.buscar && !texto.includes(f.buscar.trim().toLowerCase())) return false
    if (f.estado && a.estado !== f.estado) return false
    if (f.alcance === 'PROYECTO' && a.actividad_id) return false
    if (f.alcance === 'ACTIVIDAD' && !a.actividad_id) return false
    if (f.rol && a.rol_en_proyecto !== f.rol) return false
    if (f.actividad && String(a.actividad_id) !== f.actividad) return false
    if (f.vencen) {
      if (a.estado !== 'ACTIVO' || !a.fecha_fin_programada) return false
      const dias = (new Date(soloDia(a.fecha_fin_programada)) - new Date(new Date().toISOString().slice(0, 10))) / 86400000
      if (dias < 0 || dias > DIAS_POR_VENCER) return false
    }
    return true
  })

  const cargar = () => {
    setError('')
    return Promise.all([
      api.get('/proyectos'),
      api.get('/etapas', { params: { proyecto_id: id } }),
      api.get('/actividades', { params: { proyecto_id: id } }),
      api.get('/trabajadores').catch(() => ({ data: [] })),
      api.get('/asignaciones', { params: { proyecto_id: id } }).catch(() => ({ data: [] })),
    ])
      .then(([p, e, a, t, as]) => {
        setProyecto(p.data.find((x) => String(x.id) === String(id)) ?? null)
        setEtapas(e.data)
        setActividades(a.data)
        setResponsables(t.data)
        setAsignaciones(as.data)
      })
      .catch(() => setError('No se pudo cargar el plan de trabajo.'))
  }

  useEffect(() => {
    cargar()
  }, [id])

  const crearEtapa = async (e) => {
    e.preventDefault()
    setErrorEtapa('')
    setAviso('')
    try {
      await api.post('/etapas', { ...etapaForm, proyecto_id: Number(id) })
      setEtapaForm(ETAPA_VACIA)
      setAbrirEtapa(false)
      setAviso('Etapa registrada.')
      cargar()
    } catch (err) {
      setErrorEtapa(mensajeError(err, 'No se pudo registrar la etapa.'))
    }
  }

  /** RBAC: asigna a un trabajador al proyecto o a una de sus actividades. */
  const asignarPersonal = async (e) => {
    e.preventDefault()
    setErrorAcceso('')
    setAviso('')
    setGuardandoAcceso(true)
    try {
      const { data } = await api.post('/asignaciones', {
        proyecto_id: Number(id),
        trabajador_id: Number(accesoForm.trabajador_id),
        actividad_id: accesoForm.actividad_id ? Number(accesoForm.actividad_id) : null,
        rol_en_proyecto: accesoForm.rol_en_proyecto,
        fecha_inicio: accesoForm.fecha_inicio,
        fecha_fin_programada: accesoForm.fecha_fin_programada || null,
      })
      setAccesoForm(ACCESO_VACIO)
      setAviso(`${data.asignacion.trabajador_nombre} tiene acceso al proyecto.`)
      cargar()
    } catch (err) {
      setErrorAcceso(mensajeError(err, 'No se pudo asignar el personal.'))
    } finally {
      setGuardandoAcceso(false)
    }
  }

  /** Retira el acceso vigente sin borrar la asignación (queda el historial). */
  const finalizarAsignacion = async (a) => {
    setErrorAcceso('')
    setAviso('')
    try {
      await api.patch(`/asignaciones/${a.id}`, { estado: 'FINALIZADO' })
      setAviso(`${a.trabajador_nombre}: acceso finalizado.`)
      cargar()
    } catch (err) {
      setErrorAcceso(mensajeError(err, 'No se pudo finalizar la asignación.'))
    }
  }

  const crearActividad = async (e) => {
    e.preventDefault()
    setErrorActividad('')
    setAviso('')
    try {
      await api.post('/actividades', {
        ...actividadForm,
        etapa_id: actividadEn,
        responsable_id: actividadForm.responsable_id || null,
      })
      setActividadForm(ACTIVIDAD_VACIA)
      setActividadEn(null)
      setAviso('Actividad registrada.')
      cargar()
    } catch (err) {
      setErrorActividad(mensajeError(err, 'No se pudo registrar la actividad.'))
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/proyectos" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeftIcon className="h-4 w-4" /> Volver a proyectos
      </Link>

      <PageHeader accion={<BotonActualizar onClick={cargar} />}
        title={proyecto ? proyecto.nombre : `Proyecto #${id}`}
        subtitle={
          proyecto
            ? `${proyecto.codigo} · ${fmtFecha(proyecto.fecha_inicio_programada)} — ${fmtFecha(proyecto.fecha_fin_programada)}`
            : 'Plan de trabajo'
        }
      >
        {puedeEtapas && (
          <button className="btn-primary" onClick={() => setAbrirEtapa((v) => !v)}>
            <PlusIcon className="h-5 w-5" /> Nueva etapa
          </button>
        )}
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {puedeEtapas && abrirEtapa && (
        <form onSubmit={crearEtapa} className="card space-y-4 p-6">
          <h3 className="text-base font-semibold text-slate-900">Definir etapa</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="e-nombre" className="label">Nombre</label>
              <input id="e-nombre" className="input" maxLength={100} value={etapaForm.nombre}
                onChange={(e) => setEtapaForm({ ...etapaForm, nombre: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="e-orden" className="label">Orden</label>
              <input id="e-orden" type="number" min="1" max="999" step="1" className="input" value={etapaForm.orden}
                onChange={(e) => setEtapaForm({ ...etapaForm, orden: e.target.value })}
                placeholder="Automático si se deja vacío" />
            </div>
            <div>
              <label htmlFor="e-inicio" className="label">Inicio programado</label>
              <input id="e-inicio" type="date" className="input" value={etapaForm.fecha_inicio_programada}
                min={proyDesde || undefined} max={etapaForm.fecha_fin_programada || proyHasta || undefined}
                onChange={(e) => setEtapaForm({ ...etapaForm, fecha_inicio_programada: e.target.value })} />
            </div>
            <div>
              <label htmlFor="e-fin" className="label">Fin programado</label>
              <input id="e-fin" type="date" className="input" value={etapaForm.fecha_fin_programada}
                min={etapaForm.fecha_inicio_programada || proyDesde || undefined} max={proyHasta || undefined}
                onChange={(e) => setEtapaForm({ ...etapaForm, fecha_fin_programada: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertaFormulario mensaje={errorEtapa} />
            <button type="submit" className="btn-primary">Registrar etapa</button>
            <button type="button" className="btn-ghost"
              onClick={() => { setAbrirEtapa(false); setEtapaForm(ETAPA_VACIA); setErrorEtapa('') }}>Cancelar</button>
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
                  {et.estado?.replace('_', ' ').toLowerCase()}
                </span>
                {puedeActividades && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => {
                      setActividadEn(actividadEn === et.id ? null : et.id)
                      setActividadForm(ACTIVIDAD_VACIA)
                    }}
                  >
                    <PlusIcon className="h-4 w-4" /> Actividad
                  </button>
                )}
              </div>
            </div>

            {puedeActividades && actividadEn === et.id && (
              <form onSubmit={crearActividad} className="grid gap-4 border-b border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2">
                <div>
                  <label htmlFor={`a-nombre-${et.id}`} className="label">Nombre de la actividad</label>
                  <input id={`a-nombre-${et.id}`} className="input" value={actividadForm.nombre}
                    onChange={(e) => setActividadForm({ ...actividadForm, nombre: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor={`a-resp-${et.id}`} className="label">Responsable</label>
                  <BuscadorSelect
                    id={`a-resp-${et.id}`}
                    value={actividadForm.responsable_id}
                    onChange={(v) => setActividadForm({ ...actividadForm, responsable_id: v })}
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
                  <input id={`a-inicio-${et.id}`} type="date" className="input" value={actividadForm.fecha_inicio_programada}
                    min={proyDesde || undefined} max={actividadForm.fecha_fin_programada || proyHasta || undefined}
                    onChange={(e) => setActividadForm({ ...actividadForm, fecha_inicio_programada: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor={`a-fin-${et.id}`} className="label">Fin programado</label>
                  <input id={`a-fin-${et.id}`} type="date" className="input" value={actividadForm.fecha_fin_programada}
                    min={actividadForm.fecha_inicio_programada || proyDesde || undefined} max={proyHasta || undefined}
                    onChange={(e) => setActividadForm({ ...actividadForm, fecha_fin_programada: e.target.value })} required />
                </div>
                <div className="sm:col-span-2">
                  <AlertaFormulario mensaje={errorActividad} />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button type="submit" className="btn-primary">Registrar actividad</button>
                  <button type="button" className="btn-ghost" onClick={() => { setActividadEn(null); setErrorActividad('') }}>Cancelar</button>
                </div>
              </form>
            )}

            {acts.length === 0 ? (
              <p className="px-5 py-4 text-xs text-slate-400">Sin actividades en esta etapa.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5 font-semibold">Actividad</th>
                    <th className="px-5 py-2.5 font-semibold">Responsable</th>
                    <th className="px-5 py-2.5 font-semibold">Fechas</th>
                    <th className="px-5 py-2.5 font-semibold">Estado</th>
                    <th className="px-5 py-2.5 font-semibold">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {acts.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3 font-medium text-slate-700">{a.nombre}</td>
                      <td className="px-5 py-3 text-slate-600">{a.responsable_nombre ?? '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {fmtFecha(a.fecha_inicio_programada)} — {fmtFecha(a.fecha_fin_programada)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${ESTADO_BADGE[a.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                          {a.estado?.replace('_', ' ').toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold tabular-nums text-slate-600">
                        {Number(a.porcentaje_avance)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <form onSubmit={asignarPersonal} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label htmlFor="ac-trabajador" className="label">Trabajador</label>
              <BuscadorSelect
                id="ac-trabajador"
                value={accesoForm.trabajador_id}
                onChange={(v) => setAccesoForm({ ...accesoForm, trabajador_id: v })}
                opciones={responsables.map((t) => ({
                  value: t.id,
                  label: `${t.nombres} ${t.apellidos}`,
                  sublabel: [t.cargo, t.especialidad].filter(Boolean).join(' · '),
                }))}
                placeholder="Escriba el nombre del trabajador…"
                requerido
              />
            </div>
            <div>
              <label htmlFor="ac-rol" className="label">Rol en el proyecto</label>
              <input
                id="ac-rol"
                maxLength={100}
                className="input"
                placeholder="Residente, oficial…"
                value={accesoForm.rol_en_proyecto}
                onChange={(e) => setAccesoForm({ ...accesoForm, rol_en_proyecto: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="ac-actividad" className="label">Actividad (opcional)</label>
              <select
                id="ac-actividad"
                className="input"
                value={accesoForm.actividad_id}
                onChange={(e) => setAccesoForm({ ...accesoForm, actividad_id: e.target.value })}
              >
                <option value="">Todo el proyecto</option>
                {actividades.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
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
                min={proyDesde || undefined}
                max={accesoForm.fecha_fin_programada || proyHasta || undefined}
                onChange={(e) => setAccesoForm({ ...accesoForm, fecha_inicio: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="ac-fin" className="label">Fin programado (opcional)</label>
              <input
                id="ac-fin"
                type="date"
                className="input"
                value={accesoForm.fecha_fin_programada}
                min={accesoForm.fecha_inicio || proyDesde || undefined}
                max={proyHasta || undefined}
                onChange={(e) => setAccesoForm({ ...accesoForm, fecha_fin_programada: e.target.value })}
              />
            </div>
            <div className="flex items-end xl:col-span-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={guardandoAcceso || !accesoForm.trabajador_id}
              >
                {guardandoAcceso ? 'Asignando…' : 'Dar acceso'}
              </button>
            </div>
            {errorAcceso && (
              <div className="sm:col-span-2 xl:col-span-4">
                <AlertaFormulario mensaje={errorAcceso} />
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
                  placeholder="Nombre, cargo, rol o actividad…"
                  value={filtroAcceso.buscar}
                  onChange={(e) => setFiltroAcceso({ ...filtroAcceso, buscar: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="fa-estado" className="label">Estado</label>
                <select id="fa-estado" className="input" value={filtroAcceso.estado}
                  onChange={(e) => setFiltroAcceso({ ...filtroAcceso, estado: e.target.value })}>
                  <option value="">Todos</option>
                  <option value="ACTIVO">Vigente</option>
                  <option value="FINALIZADO">Finalizado</option>
                  <option value="REASIGNADO">Reasignado</option>
                </select>
              </div>
              <div>
                <label htmlFor="fa-alcance" className="label">Alcance</label>
                <select id="fa-alcance" className="input" value={filtroAcceso.alcance}
                  onChange={(e) => setFiltroAcceso({ ...filtroAcceso, alcance: e.target.value })}>
                  <option value="">Todos</option>
                  <option value="PROYECTO">Todo el proyecto</option>
                  <option value="ACTIVIDAD">Por actividad</option>
                </select>
              </div>
              <div>
                <label htmlFor="fa-rol" className="label">Rol en el proyecto</label>
                <select id="fa-rol" className="input" value={filtroAcceso.rol}
                  onChange={(e) => setFiltroAcceso({ ...filtroAcceso, rol: e.target.value })}>
                  <option value="">Todos</option>
                  {rolesAcceso.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="fa-actividad" className="label">Actividad</label>
                <select id="fa-actividad" className="input" value={filtroAcceso.actividad}
                  onChange={(e) => setFiltroAcceso({ ...filtroAcceso, actividad: e.target.value })}>
                  <option value="">Todas</option>
                  {actividades.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={filtroAcceso.vencen}
                  onChange={(e) => setFiltroAcceso({ ...filtroAcceso, vencen: e.target.checked })} />
                Vencen en los próximos {DIAS_POR_VENCER} días
              </label>
              <div className="flex items-center justify-end sm:col-span-2">
                <button type="button" className="btn-ghost" disabled={filtrosActivos === 0}
                  onClick={() => setFiltroAcceso(FILTRO_ACCESO_VACIO)}>
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
                    <th className="px-5 py-3 font-semibold">Rol en el proyecto</th>
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
                      <td className="px-5 py-3 text-slate-600">{a.rol_en_proyecto ?? '—'}</td>
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
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin acciones</span>
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

      <p className="text-xs text-slate-400">
        Las fechas de las etapas y actividades se validan dentro del rango del proyecto.
      </p>
    </div>
  )
}
