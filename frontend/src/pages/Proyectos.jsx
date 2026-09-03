import { Link } from 'react-router-dom'
import { PlusIcon } from '@heroicons/react/24/outline'
import { proyectos, estadoLabels } from '../lib/mockData.js'

const fmtCOP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function Proyectos() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Proyectos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registro, etapas, actividades y seguimiento de avance · RF2 · RF3 · RF4
          </p>
        </div>
        <button className="btn-primary">
          <PlusIcon className="h-4 w-4" /> Nuevo proyecto
        </button>
      </div>

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
                const est = estadoLabels[p.estado] ?? estadoLabels.planificacion
                return (
                  <tr key={p.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <Link to="#" className="font-semibold text-slate-900 hover:text-brand-600">
                        {p.nombre}
                      </Link>
                      <p className="text-xs text-slate-400">{p.cliente}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{p.responsable}</td>
                    <td className="px-5 py-4 text-slate-600">{p.ubicacion}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">{fmtCOP(p.presupuesto)}</td>
                    <td className="px-5 py-4">
                      <span className={`badge ring-1 ${est.cls}`}>{est.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-600 transition-all"
                            style={{ width: `${p.avance}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{p.avance}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        El avance del proyecto se deriva de sus actividades según la regla de cálculo definida por la empresa (RN9).
        Las etapas y actividades con responsables, fechas y evidencias llegan en el sprint 1 (RF3 · RF4).
      </p>
    </div>
  )
}