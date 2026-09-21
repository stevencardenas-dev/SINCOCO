import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BellAlertIcon,
  CheckCircleIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  SunIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from '../components/StatCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { avanceSeries, incidencias, materiales } from '../lib/mockData.js'
import { estadoIncidente, fmtCOP, fmtFecha } from '../lib/format.js'

export default function Dashboard() {
  const { user } = useAuth()
  const bajoStock = materiales.filter((m) => m.existencia <= m.nivelMinimo)

  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hoyCapitalizado = hoy.charAt(0).toUpperCase() + hoy.slice(1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500">{hoyCapitalizado}</p>
        <div className="mt-1 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-black">
            <SunIcon className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Buen día, {user?.username ?? 'Usuario'}</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Resumen operativo de la constructora: proyectos, inventario, personal y costos.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FolderIcon} label="Proyectos activos" value="3" hint="2 en ejecución · 1 en planeación" tone="brand" />
        <StatCard icon={BellAlertIcon} label="Alertas de inventario" value={bajoStock.length} hint="Materiales por debajo del nivel mínimo" tone="amber" />
        <StatCard icon={UsersIcon} label="Personal en obra" value="14" hint="3 maestros · 11 obreros" tone="slate" />
        <StatCard icon={CurrencyDollarIcon} label="Costo consolidado" value={fmtCOP(462_800_000)} hint="Materiales + servicios del periodo" tone="slate" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Avance */}
        <div className="card p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Avance de proyectos</h3>
              <p className="text-xs text-slate-500">% de avance mensual · RF04 · RN09</p>
            </div>
            <Link to="/proyectos" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Ver proyectos <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={avanceSeries} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#171717" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(v) => [`${v}%`]}
                />
                <Area type="monotone" dataKey="Los Álamos" stroke="#171717" strokeWidth={2.5} fill="url(#gA)" />
                <Area type="monotone" dataKey="El Portal" stroke="#eab308" strokeWidth={2.5} fill="url(#gB)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Alertas de inventario</h3>
            <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">{bajoStock.length} activas</span>
          </div>

          {bajoStock.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-700">Todo en orden</p>
              <p className="text-xs text-slate-500">Ningún material por debajo de su nivel mínimo.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {bajoStock.map((m) => (
                <li key={m.id} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                  <CubeIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{m.nombre}</p>
                    <p className="text-xs text-slate-500">
                      Existencias: <strong className="text-amber-700">{m.existencia} {m.unidad}</strong> · mínimo {m.nivelMinimo}
                    </p>
                  </div>
                  <span className="badge bg-amber-100 text-amber-700">RF23</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Las alertas se generan automáticamente cuando la existencia alcanza el nivel mínimo definido en RF09.
          </p>
        </div>
      </div>

      {/* Incidencias */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Incidencias de obra</h3>
            <p className="text-xs text-slate-500">Novedades registradas en los proyectos · RF22</p>
          </div>
          <Link to="/incidencias" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            Ver todas <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {incidencias.map((i) => {
            const est = estadoIncidente[i.estado] ?? { label: i.estado, cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
            return (
              <div key={i.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="badge bg-red-50 text-red-700 ring-1 ring-red-200">
                    <ExclamationTriangleIcon className="h-3 w-3" /> {i.tipo}
                  </span>
                  <span className={`badge ring-1 ${est.cls}`}>{est.label}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">{i.proyecto}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{i.descripcion}</p>
                <p className="mt-2 text-[11px] text-slate-400">{fmtFecha(i.fecha)}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}