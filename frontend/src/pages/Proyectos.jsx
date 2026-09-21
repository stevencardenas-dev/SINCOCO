import { useEffect, useState } from 'react'
import { FolderIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import api from '../services/api'
import { estadoProyecto, fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * Módulo de proyectos (RF02 · HU-02). Primera integración con el backend:
 * el listado consume GET /api/proyectos (datos reales). El formulario de
 * registro (CU-02) llega en el siguiente avance del sprint.
 */
export default function Proyectos() {
  const [proyectos, setProyectos] = useState(null)
  const [error, setError] = useState(null)

  const cargar = () => {
    setError(null)
    api
      .get('/proyectos')
      .then((res) => setProyectos(res.data))
      .catch(() => setError('No se pudieron cargar los proyectos. Verifique que el backend esté disponible.'))
  }

  // Carga inicial; el listado se refresca al volver a la pestaña.
  useEffect(cargar, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        subtitle="Registro, etapas, actividades y seguimiento de avance · RF02 · RF03 · RF04"
      >
        <button type="button" onClick={cargar} className="btn-ghost inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" /> Actualizar
        </button>
      </PageHeader>

      {error && (
        <div role="alert" className="card border-l-4 border-red-400 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {proyectos === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando proyectos…
        </div>
      )}

      {proyectos !== null && proyectos.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <FolderIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay proyectos</p>
          <p className="text-xs text-slate-500">
            El registro del primer proyecto (CU-02) se habilita con el formulario en el próximo avance.
          </p>
        </div>
      )}

      {proyectos !== null && proyectos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5 font-semibold">Proyecto</th>
                  <th className="px-5 py-3.5 font-semibold">Responsable</th>
                  <th className="px-5 py-3.5 font-semibold">Ubicación</th>
                  <th className="px-5 py-3.5 font-semibold">Presupuesto</th>
                  <th className="px-5 py-3.5 font-semibold">Estado</th>
                  <th className="px-5 py-3.5 font-semibold">Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proyectos.map((p) => {
                  // El backend devuelve el enum del esquema (PLANIFICACION, ...);
                  // format.js lo indexa en minúsculas.
                  const est = estadoProyecto[p.estado?.toLowerCase()] ?? estadoProyecto.planificacion
                  const avance = Number(p.porcentaje_avance_total)
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{p.nombre}</p>
                        <p className="text-xs text-slate-400">
                          {p.codigo} · {p.cliente_nombre} · {fmtFecha(p.fecha_inicio_programada)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{p.responsable_nombre}</td>
                      <td className="px-5 py-4 text-slate-600">{p.ubicacion}</td>
                      <td className="px-5 py-4 font-medium tabular-nums text-slate-700">
                        {fmtCOP(Number(p.presupuesto_inicial))}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge ring-1 ${est.cls}`}>{est.label}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-brand-600 transition-all"
                              style={{ width: `${avance}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-slate-600">{avance}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        El avance del proyecto se deriva de sus actividades según la regla de cálculo definida por la empresa (RN09).
        Las etapas y actividades con responsables, fechas y evidencias llegan con HU-03 (RF03 · RF04).
      </p>
    </div>
  )
}
