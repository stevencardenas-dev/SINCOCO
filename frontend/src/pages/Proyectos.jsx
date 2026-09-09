import { FolderIcon, PlusIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import { proyectos } from '../lib/mockData.js'
import { estadoProyecto, fmtCOP } from '../lib/format.js'

export default function Proyectos() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        subtitle="Registro, etapas, actividades y seguimiento de avance · RF2 · RF3 · RF4"
      >
        <button className="btn-primary">
          <PlusIcon className="h-4 w-4" /> Nuevo proyecto
        </button>
      </PageHeader>

      {proyectos.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <FolderIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay proyectos</p>
          <p className="text-xs text-slate-500">Registre el primer proyecto para empezar a darle seguimiento.</p>
        </div>
      ) : (
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
                  const est = estadoProyecto[p.estado] ?? estadoProyecto.planificacion
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{p.nombre}</p>
                        <p className="text-xs text-slate-400">{p.cliente}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{p.responsable}</td>
                      <td className="px-5 py-4 text-slate-600">{p.ubicacion}</td>
                      <td className="px-5 py-4 font-medium tabular-nums text-slate-700">{fmtCOP(p.presupuesto)}</td>
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
                          <span className="text-xs font-semibold tabular-nums text-slate-600">{p.avance}%</span>
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
        El avance del proyecto se deriva de sus actividades según la regla de cálculo definida por la empresa (RN9).
        Las etapas y actividades con responsables, fechas y evidencias llegan en el sprint 1 (RF3 · RF4).
      </p>
    </div>
  )
}