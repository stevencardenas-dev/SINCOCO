import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeftIcon, ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-03 (RF03 · RF04): plan de trabajo de un proyecto. Define etapas y, dentro
 * de cada etapa, actividades con responsable y fechas. El backend valida que
 * las fechas queden dentro del rango del proyecto y que la etapa pertenezca al
 * proyecto.
 */

const ETAPA_VACIA = { nombre: '', descripcion: '', orden: '', fecha_inicio_programada: '', fecha_fin_programada: '' }
const ACTIVIDAD_VACIA = { nombre: '', responsable_id: '', fecha_inicio_programada: '', fecha_fin_programada: '' }

const ESTADO_BADGE = {
  PENDIENTE: 'bg-slate-100 text-slate-600',
  EN_PROCESO: 'bg-sky-50 text-sky-700',
  COMPLETADA: 'bg-emerald-50 text-emerald-700',
  ATRASADA: 'bg-red-50 text-red-700',
  SUSPENDIDA: 'bg-amber-50 text-amber-700',
}

export default function PlanProyecto() {
  const { id } = useParams()
  const { user } = useAuth()
  const esAdmin = user?.rol === 'ADMINISTRADOR'

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

  const cargar = () => {
    setError('')
    Promise.all([
      api.get('/proyectos'),
      api.get('/etapas', { params: { proyecto_id: id } }),
      api.get('/actividades', { params: { proyecto_id: id } }),
      api.get('/trabajadores').catch(() => ({ data: [] })),
    ])
      .then(([p, e, a, t]) => {
        setProyecto(p.data.find((x) => String(x.id) === String(id)) ?? null)
        setEtapas(e.data)
        setActividades(a.data)
        setResponsables(t.data)
      })
      .catch(() => setError('No se pudo cargar el plan de trabajo.'))
  }

  useEffect(cargar, [id])

  const crearEtapa = async (e) => {
    e.preventDefault()
    setError('')
    setAviso('')
    try {
      await api.post('/etapas', { ...etapaForm, proyecto_id: Number(id) })
      setEtapaForm(ETAPA_VACIA)
      setAbrirEtapa(false)
      setAviso('Etapa registrada.')
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo registrar la etapa.')
    }
  }

  const crearActividad = async (e) => {
    e.preventDefault()
    setError('')
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
      setError(err.response?.data?.error ?? 'No se pudo registrar la actividad.')
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/proyectos" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeftIcon className="h-4 w-4" /> Volver a proyectos
      </Link>

      <PageHeader
        title={proyecto ? proyecto.nombre : `Proyecto #${id}`}
        subtitle={
          proyecto
            ? `${proyecto.codigo} · ${fmtFecha(proyecto.fecha_inicio_programada)} — ${fmtFecha(proyecto.fecha_fin_programada)} · RF03 · RF04`
            : 'Plan de trabajo · RF03 · RF04'
        }
      >
        {esAdmin && (
          <button className="btn-primary" onClick={() => setAbrirEtapa((v) => !v)}>
            <PlusIcon className="h-5 w-5" /> Nueva etapa
          </button>
        )}
        <button type="button" onClick={cargar} className="btn-ghost inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" /> Actualizar
        </button>
      </PageHeader>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {aviso && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{aviso}</p>}

      {esAdmin && abrirEtapa && (
        <form onSubmit={crearEtapa} className="card space-y-4 p-6">
          <h3 className="text-base font-semibold text-slate-900">Definir etapa</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="e-nombre" className="label">Nombre</label>
              <input id="e-nombre" className="input" value={etapaForm.nombre}
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
                onChange={(e) => setEtapaForm({ ...etapaForm, fecha_inicio_programada: e.target.value })} />
            </div>
            <div>
              <label htmlFor="e-fin" className="label">Fin programado</label>
              <input id="e-fin" type="date" className="input" value={etapaForm.fecha_fin_programada}
                onChange={(e) => setEtapaForm({ ...etapaForm, fecha_fin_programada: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary">Registrar etapa</button>
            <button type="button" className="btn-ghost"
              onClick={() => { setAbrirEtapa(false); setEtapaForm(ETAPA_VACIA) }}>Cancelar</button>
          </div>
        </form>
      )}

      {etapas.length === 0 && (
        <div className="card px-6 py-14 text-center text-sm text-slate-500">
          Este proyecto aún no tiene etapas. {esAdmin && 'Defina la primera con «Nueva etapa».'}
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
                {esAdmin && (
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

            {esAdmin && actividadEn === et.id && (
              <form onSubmit={crearActividad} className="grid gap-4 border-b border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2">
                <div>
                  <label htmlFor={`a-nombre-${et.id}`} className="label">Nombre de la actividad</label>
                  <input id={`a-nombre-${et.id}`} className="input" value={actividadForm.nombre}
                    onChange={(e) => setActividadForm({ ...actividadForm, nombre: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor={`a-resp-${et.id}`} className="label">Responsable</label>
                  <select id={`a-resp-${et.id}`} className="input" value={actividadForm.responsable_id}
                    onChange={(e) => setActividadForm({ ...actividadForm, responsable_id: e.target.value })}>
                    <option value="">Sin asignar…</option>
                    {responsables.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombres} {t.apellidos} — {t.cargo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`a-inicio-${et.id}`} className="label">Inicio programado</label>
                  <input id={`a-inicio-${et.id}`} type="date" className="input" value={actividadForm.fecha_inicio_programada}
                    onChange={(e) => setActividadForm({ ...actividadForm, fecha_inicio_programada: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor={`a-fin-${et.id}`} className="label">Fin programado</label>
                  <input id={`a-fin-${et.id}`} type="date" className="input" value={actividadForm.fecha_fin_programada}
                    onChange={(e) => setActividadForm({ ...actividadForm, fecha_fin_programada: e.target.value })} required />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button type="submit" className="btn-primary">Registrar actividad</button>
                  <button type="button" className="btn-ghost" onClick={() => setActividadEn(null)}>Cancelar</button>
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

      <p className="text-xs text-slate-400">
        Criterio HU-03: las fechas de etapas y actividades se validan dentro del rango del proyecto.
      </p>
    </div>
  )
}
