import { useEffect, useState } from 'react'
import { ArrowPathIcon, ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { costosApi } from '../services/costos'
import { proyectosApi } from '../services/proyectos'
import { useRecurso } from '../hooks/useRecurso'
import { fmtCOP, fmtFechaHora } from '../lib/format.js'

/**
 * HU-39 · desviaciones presupuestales en tiempo real.
 *
 * Desviación = (costo real − presupuesto inicial) / presupuesto inicial × 100,
 * con el último corte de consolidación (HU-15) y el desglose por materiales,
 * servicios externos y órdenes de compra. El semáforo usa umbrales
 * configurables desde la misma pantalla. Un proyecto sin consolidar se muestra
 * vacío con su advertencia, sin afectar a los demás.
 */

const SEMAFORO = {
  NORMAL: { label: 'Normal', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#34d399' },
  ADVERTENCIA: { label: 'Advertencia', cls: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#fbbf24' },
  CRITICA: { label: 'Crítica', cls: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#f87171' },
  SIN_DATOS: { label: 'Sin datos', cls: 'bg-slate-100 text-slate-500 ring-slate-200', color: '#cbd5e1' },
}

const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'PLANIFICACION', etiqueta: 'Planificación' },
  { valor: 'EN_EJECUCION', etiqueta: 'En ejecución' },
  { valor: 'PAUSADO', etiqueta: 'Congelado' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado' },
]

export default function DesviacionesPresupuesto({ estado = '' }) {
  const [proyectoId, setProyectoId] = useState('')
  const [proyectos, setProyectos] = useState([])
  const [umbralAdvertencia, setUmbralAdvertencia] = useState('5')
  const [umbralCritico, setUmbralCritico] = useState('15')

  const desviaciones = useRecurso(
    () =>
      costosApi.desviaciones({
        estado,
        proyecto_id: proyectoId,
        umbral_advertencia: umbralAdvertencia,
        umbral_critico: umbralCritico,
      }),
    [estado, proyectoId, umbralAdvertencia, umbralCritico],
    { mensaje: 'No se pudieron cargar las desviaciones presupuestales.' },
  )

  useEffect(() => {
    proyectosApi.listar().then(setProyectos).catch(() => setProyectos([]))
  }, [])

  const datos = desviaciones.datos
  const conDatos = (datos?.proyectos ?? []).filter((p) => !p.sin_datos)

  return (
    <section className="card bg-gradient-to-br from-white via-white to-accent-50 p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Desviación presupuestal</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            (Costo real − presupuesto inicial) / presupuesto inicial × 100, sobre el último corte de
            consolidación de cada proyecto.
            {datos?.ultima_consolidacion && (
              <> Última consolidación: {fmtFechaHora(datos.ultima_consolidacion)}.</>
            )}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={desviaciones.recargar}
          disabled={desviaciones.cargando}
        >
          <ArrowPathIcon className={`h-4 w-4 ${desviaciones.cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="des-proyecto" className="label">Proyecto</label>
          <select
            id="des-proyecto"
            className="input"
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="des-estado" className="label">Estado</label>
          <select id="des-estado" className="input" value={estado} disabled>
            {ESTADOS.map((e) => (
              <option key={e.etiqueta} value={e.valor}>{e.etiqueta}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">Se toma de los filtros de arriba.</p>
        </div>
        <div>
          <label htmlFor="des-advertencia" className="label">Umbral de advertencia (%)</label>
          <input
            id="des-advertencia"
            type="number"
            min="0"
            step="1"
            className="input tabular-nums"
            value={umbralAdvertencia}
            onChange={(e) => setUmbralAdvertencia(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="des-critico" className="label">Umbral crítico (%)</label>
          <input
            id="des-critico"
            type="number"
            min="0"
            step="1"
            className="input tabular-nums"
            value={umbralCritico}
            onChange={(e) => setUmbralCritico(e.target.value)}
          />
        </div>
      </div>

      {desviaciones.error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {desviaciones.error}
        </p>
      )}

      {!datos && !desviaciones.error && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando desviaciones…
        </div>
      )}

      {datos && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="badge bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              {datos.resumen.con_datos} con costos
            </span>
            <span className="badge ring-1 bg-rose-50 text-rose-700 ring-rose-200">
              {datos.resumen.criticos} críticas
            </span>
            <span className="badge ring-1 bg-amber-50 text-amber-800 ring-amber-200">
              {datos.resumen.advertencia} en advertencia
            </span>
            <span className="badge bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              {datos.resumen.sin_datos} sin consolidar
            </span>
            <span className="ml-auto text-slate-500">
              Desviación promedio:{' '}
              <strong className="tabular-nums text-slate-800">
                {datos.resumen.desviacion_promedio === null ? '—' : `${datos.resumen.desviacion_promedio}%`}
              </strong>
            </span>
          </div>

          {conDatos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-14 text-center">
              <ChartBarIcon className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Todavía no hay costos consolidados</p>
              <p className="text-xs text-slate-500">
                Consolide el costo de un proyecto para ver su desviación frente al presupuesto.
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conDatos} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="codigo"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    unit="%"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                    cursor={{ fill: '#fefce8' }}
                    formatter={(v, _n, item) => [`${v}%`, item.payload.nombre]}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <ReferenceLine y={Number(umbralAdvertencia)} stroke="#fbbf24" strokeDasharray="4 4" />
                  <ReferenceLine y={Number(umbralCritico)} stroke="#f87171" strokeDasharray="4 4" />
                  <Bar dataKey="desviacion_porcentaje" radius={[4, 4, 0, 0]} barSize={34}>
                    {conDatos.map((p) => (
                      <Cell key={p.id} fill={SEMAFORO[p.semaforo]?.color ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Proyecto</th>
                  <th className="px-3 py-2 text-right font-semibold">Materiales</th>
                  <th className="px-3 py-2 text-right font-semibold">Servicios</th>
                  <th className="px-3 py-2 text-right font-semibold">Órdenes de compra</th>
                  <th className="px-3 py-2 text-right font-semibold">Costo real</th>
                  <th className="px-3 py-2 text-right font-semibold">Presupuesto</th>
                  <th className="px-3 py-2 text-right font-semibold">Desviación</th>
                  <th className="px-3 py-2 font-semibold">Semáforo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.proyectos.map((p) => {
                  const s = SEMAFORO[p.semaforo] ?? SEMAFORO.SIN_DATOS
                  return (
                    <tr key={p.id} className="align-middle">
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-800">{p.nombre}</p>
                        <p className="text-xs text-slate-400">{p.codigo}</p>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {p.desglose.materiales === null ? '—' : fmtCOP(p.desglose.materiales)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {p.desglose.servicios_externos === null ? '—' : fmtCOP(p.desglose.servicios_externos)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {p.desglose.ordenes_compra === null ? '—' : fmtCOP(p.desglose.ordenes_compra)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-800">
                        {p.costo_real === null ? '—' : fmtCOP(p.costo_real)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                        {fmtCOP(p.presupuesto_inicial)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${s.cls}`}>
                          {p.desviacion_porcentaje === null
                            ? '—'
                            : `${p.desviacion_porcentaje > 0 ? '+' : ''}${p.desviacion_porcentaje}%`}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`badge ring-1 ${s.cls}`}>{s.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {datos.advertencias.length > 0 && (
            <ul className="space-y-1 text-xs text-amber-800">
              {datos.advertencias.map((a) => (
                <li key={a} className="flex items-start gap-1.5">
                  <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
