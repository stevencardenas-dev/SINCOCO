import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  BellAlertIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  FunnelIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from './StatCard.jsx'
import { dashboardApi } from '../services/dashboard'
import { proyectosApi } from '../services/proyectos'
import { useRecurso } from '../hooks/useRecurso'
import { estadoProyecto, fmtFechaHora } from '../lib/format.js'

/**
 * HU-16 · dashboard gerencial.
 *
 * Muestra el avance total y el estado de cada proyecto, su último costo
 * consolidado y las alertas activas, con filtros por proyecto, estado y rango
 * de fechas. El proyecto sin consolidar aparece con el indicador vacío y su
 * advertencia, sin afectar al resto.
 *
 * El alcance lo resuelve el backend: un maestro solo ve sus proyectos y las
 * alertas de esos proyectos.
 */

const ESTADOS = [
  { valor: '', etiqueta: 'Todos los estados' },
  { valor: 'PLANIFICACION', etiqueta: 'Planificación' },
  { valor: 'EN_EJECUCION', etiqueta: 'En ejecución' },
  { valor: 'PAUSADO', etiqueta: 'Congelado' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado' },
  { valor: 'CANCELADO', etiqueta: 'Cancelado' },
]

const COLOR_ESTADO = {
  PLANIFICACION: '#38bdf8',
  EN_EJECUCION: '#34d399',
  PAUSADO: '#fbbf24',
  FINALIZADO: '#94a3b8',
  CANCELADO: '#f87171',
}

const VACIOS = { proyecto_id: '', estado: '', desde: '', hasta: '' }

export default function IndicadoresGerenciales() {
  const [filtros, setFiltros] = useState(VACIOS)
  const [proyectos, setProyectos] = useState([])
  const indicadores = useRecurso(
    () => dashboardApi.indicadores(filtros),
    [JSON.stringify(filtros)],
    { mensaje: 'No se pudieron cargar los indicadores gerenciales.' },
  )

  useEffect(() => {
    proyectosApi.listar().then(setProyectos).catch(() => setProyectos([]))
  }, [])

  const cambiar = (nombre, valor) => setFiltros((f) => ({ ...f, [nombre]: valor }))
  const hayFiltros = Object.values(filtros).some(Boolean)
  const datos = indicadores.datos

  return (
    <section className="card bg-gradient-to-br from-white via-white to-accent-50 p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Indicadores gerenciales</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Avance, estado, costo y alertas de tus proyectos, sin depender de una hoja de cálculo.
            {datos && <> Datos leídos el {fmtFechaHora(datos.generado_en)}.</>}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={indicadores.recargar}
          disabled={indicadores.cargando}
        >
          <ArrowPathIcon className={`h-4 w-4 ${indicadores.cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtros: proyecto, estado y rango de fechas de programación. */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <label htmlFor="ind-proyecto" className="label">Proyecto</label>
          <select
            id="ind-proyecto"
            className="input"
            value={filtros.proyecto_id}
            onChange={(e) => cambiar('proyecto_id', e.target.value)}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ind-estado" className="label">Estado</label>
          <select
            id="ind-estado"
            className="input"
            value={filtros.estado}
            onChange={(e) => cambiar('estado', e.target.value)}
          >
            {ESTADOS.map((e) => (
              <option key={e.etiqueta} value={e.valor}>{e.etiqueta}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ind-desde" className="label">Desde</label>
          <input
            id="ind-desde"
            type="date"
            className="input"
            value={filtros.desde}
            max={filtros.hasta || undefined}
            onChange={(e) => cambiar('desde', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ind-hasta" className="label">Hasta</label>
          <input
            id="ind-hasta"
            type="date"
            className="input"
            value={filtros.hasta}
            min={filtros.desde || undefined}
            onChange={(e) => cambiar('hasta', e.target.value)}
          />
        </div>
      </div>

      {hayFiltros && (
        <button type="button" className="btn-ghost mb-4 text-xs" onClick={() => setFiltros(VACIOS)}>
          <FunnelIcon className="h-4 w-4" /> Quitar filtros
        </button>
      )}

      {indicadores.error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {indicadores.error}
        </p>
      )}

      {!datos && !indicadores.error && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando indicadores…
        </div>
      )}

      {datos && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={SparklesIcon}
              label="Avance total"
              value={datos.avance_total === null ? '—' : `${datos.avance_total}%`}
              hint={
                datos.avance_total === null
                  ? 'Sin proyectos en el filtro'
                  : 'Ponderado por presupuesto de cada proyecto'
              }
              tone="accent"
            />
            <StatCard
              icon={FolderIcon}
              label="Proyectos"
              value={datos.proyectos.length}
              hint={hayFiltros ? 'Con los filtros aplicados' : 'Vigentes en el sistema'}
              tone="slate"
            />
            <StatCard
              icon={BellAlertIcon}
              label="Alertas activas"
              value={datos.alertas.total}
              hint={datos.alertas.por_tipo.map((t) => `${t.total} ${t.tipo.toLowerCase().replaceAll('_', ' ')}`).join(' · ') || 'Ninguna pendiente'}
              tone={datos.alertas.total > 0 ? 'amber' : 'slate'}
            />
            <StatCard
              icon={ExclamationTriangleIcon}
              label="Sin consolidar"
              value={datos.proyectos.filter((p) => p.sin_datos).length}
              hint="Proyectos sin costo consolidado todavía"
              tone="slate"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Avance por proyecto */}
            <div className="xl:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-800">Avance por proyecto</h4>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                  {ESTADOS.filter((e) => e.valor).map((e) => (
                    <span key={e.valor} className="inline-flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: COLOR_ESTADO[e.valor] }}
                        aria-hidden="true"
                      />
                      {e.etiqueta}
                    </span>
                  ))}
                </div>
              </div>

              {datos.proyectos.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-14 text-center">
                  <FolderIcon className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No hay proyectos con ese filtro</p>
                  <p className="text-xs text-slate-500">Cambia el proyecto, el estado o el rango de fechas.</p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={datos.proyectos}
                      layout="vertical"
                      margin={{ top: 4, right: 20, left: 4, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="codigo"
                        width={92}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                        cursor={{ fill: '#fefce8' }}
                        formatter={(v, _n, item) => [
                          `${v}% · ${estadoProyecto[String(item.payload.estado).toLowerCase()]?.label ?? item.payload.estado}`,
                          item.payload.nombre,
                        ]}
                      />
                      <Bar dataKey="avance" radius={[0, 6, 6, 0]} barSize={18}>
                        {datos.proyectos.map((p) => (
                          <Cell key={p.id} fill={COLOR_ESTADO[p.estado] ?? '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {datos.advertencias.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-amber-800">
                  {datos.advertencias.map((a) => (
                    <li key={a} className="flex items-start gap-1.5">
                      <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Estado y costo por proyecto */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800">Estado y último costo</h4>
              {datos.proyectos.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500">
                  Sin proyectos para mostrar.
                </p>
              ) : (
                <ul className="space-y-2">
                  {datos.proyectos.slice(0, 6).map((p) => {
                    const est = estadoProyecto[String(p.estado).toLowerCase()] ?? { label: p.estado, cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
                    return (
                      <li key={p.id} className="rounded-xl border border-slate-200 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{p.nombre}</p>
                          <span className={`badge ring-1 ${est.cls}`}>{est.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {p.codigo} · {p.avance}% de avance ·{' '}
                          {p.sin_datos
                            ? 'sin costo consolidado'
                            : `desviación ${p.desviacion_porcentaje === null ? '—' : `${p.desviacion_porcentaje}%`}`}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}

              <h4 className="mb-2 mt-4 text-sm font-semibold text-slate-800">Alertas activas</h4>
              {datos.alertas.activas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500">
                  No hay alertas pendientes para tus proyectos.
                </p>
              ) : (
                <ul className="space-y-2">
                  {datos.alertas.activas.map((a) => (
                    <li key={a.id} className="rounded-xl bg-amber-50/70 px-3 py-2 ring-1 ring-amber-100">
                      <p className="text-xs font-semibold text-slate-800">{a.titulo}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{a.descripcion}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
