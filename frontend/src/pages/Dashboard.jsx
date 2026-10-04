import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BellAlertIcon,
  CheckCircleIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  InboxIcon,
  SunIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from '../components/StatCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'
import {
  estadoIncidente,
  estadoProyecto,
  fmtCOP,
  fmtCOPCompacto,
  fmtFecha,
  fmtFechaHora,
  severidadIncidente,
} from '../lib/format.js'

/**
 * Panel de inicio (RF04 · RF09 · RF22 · RF26).
 *
 * Todos los indicadores se calculan en el backend a partir de las tablas del
 * sistema (`GET /api/dashboard`). No hay cifras de demostración: si una tabla
 * está vacía, la tarjeta muestra cero y la pantalla explica que aún no hay
 * registros, en vez de rellenar el hueco con datos inventados.
 */

const etiquetaEstado = (estado) =>
  estadoProyecto[String(estado).toLowerCase()]?.label ?? estado

const resumenEstados = (porEstado) => {
  if (porEstado.length === 0) return 'Sin proyectos registrados'
  return porEstado.map((e) => `${e.total} en ${etiquetaEstado(e.estado).toLowerCase()}`).join(' · ')
}

const resumenCargos = (porCargo) => {
  if (porCargo.length === 0) return 'Sin personal registrado'
  return porCargo
    .slice(0, 2)
    .map((c) => `${c.total} ${c.cargo}`)
    .join(' · ')
}

export default function Dashboard() {
  const { user } = useAuth()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  const cargar = () => {
    setCargando(true)
    setError('')
    api
      .get('/dashboard')
      .then((res) => setDatos(res.data))
      .catch(() => setError('No se pudieron cargar los indicadores del panel.'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const hoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const hoyCapitalizado = hoy.charAt(0).toUpperCase() + hoy.slice(1)

  const proyectos = datos?.proyectos
  const inventario = datos?.inventario
  const personal = datos?.personal
  const costos = datos?.costos
  const incidencias = datos?.incidencias

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500">{hoyCapitalizado}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-300 to-accent-500 text-brand-950 shadow-sm ring-1 ring-inset ring-accent-500/30">
            <SunIcon className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Buen día, {user?.username ?? 'Usuario'}
          </h2>
          <button
            type="button"
            onClick={cargar}
            className="btn-ghost ml-auto text-xs"
            disabled={cargando}
          >
            <ArrowPathIcon className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Resumen operativo de la constructora: proyectos, inventario, personal y costos.
          {datos && <> Datos leídos de la base el {fmtFechaHora(datos.generado_en)}.</>}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {!datos && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando indicadores…
        </div>
      )}

      {datos && (
        <>
          {/* Indicadores */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={FolderIcon}
              label="Proyectos activos"
              value={proyectos.activos}
              hint={resumenEstados(proyectos.por_estado)}
              tone="accent"
            />
            <StatCard
              icon={BellAlertIcon}
              label="Alertas de inventario"
              value={inventario.bajo_stock}
              hint={
                inventario.materiales === 0
                  ? 'Sin materiales en el catálogo'
                  : 'Materiales en o bajo su nivel mínimo'
              }
              tone={inventario.bajo_stock > 0 ? 'amber' : 'slate'}
            />
            <StatCard
              icon={UsersIcon}
              label="Personal activo"
              value={personal.activos}
              hint={`${resumenCargos(personal.por_cargo)} · ${personal.con_cuenta} con cuenta`}
              tone="slate"
            />
            <StatCard
              icon={CurrencyDollarIcon}
              label="Costo consolidado"
              value={fmtCOPCompacto(proyectos.presupuesto_activos)}
              title={fmtCOP(proyectos.presupuesto_activos)}
              hint={`Costo real registrado: ${fmtCOPCompacto(costos.total)}`}
              tone="slate"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Avance por proyecto */}
            <div className="card bg-gradient-to-br from-white via-white to-accent-50 p-6 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Avance de proyectos</h3>
                    <span className="badge bg-accent-100 px-2 py-0 text-[10px] uppercase tracking-wide text-accent-700 ring-1 ring-accent-300">
                      Próximamente
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">% de avance registrado por proyecto</p>
                </div>
                <Link
                  to="/proyectos"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  Ver proyectos <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>

              {proyectos.avance.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-16 text-center">
                  <FolderIcon className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">
                    Todavía no hay proyectos activos
                  </p>
                  <p className="text-xs text-slate-500">
                    El avance se grafica en cuanto se registre un proyecto con sus etapas.
                  </p>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={proyectos.avance}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradAvance" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#fde047" />
                          <stop offset="100%" stopColor="#eab308" />
                        </linearGradient>
                      </defs>
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
                        width={116}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                        cursor={{ fill: '#fefce8' }}
                        formatter={(v) => [`${v}%`, 'Avance']}
                        labelFormatter={(codigo) =>
                          proyectos.avance.find((p) => p.codigo === codigo)?.nombre ?? codigo
                        }
                      />
                      <Bar dataKey="avance" fill="url(#gradAvance)" radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Alertas de inventario */}
            <div className="card bg-gradient-to-b from-accent-50 to-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Alertas de inventario</h3>
                <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                  {inventario.bajo_stock} activas
                </span>
              </div>

              {inventario.materiales === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                  <InboxIcon className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">
                    Sin materiales en el catálogo
                  </p>
                  <p className="text-xs text-slate-500">
                    El catálogo está vacío, así que no hay existencias que vigilar.
                  </p>
                </div>
              ) : inventario.detalle.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-700">Todo en orden</p>
                  <p className="text-xs text-slate-500">
                    Ninguno de los {inventario.materiales} materiales está por debajo de su nivel
                    mínimo.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {inventario.detalle.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3"
                    >
                      <CubeIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {m.descripcion}
                        </p>
                        <p className="text-xs text-slate-500">
                          Existencias:{' '}
                          <strong className="text-amber-700">
                            {m.existencia_total} {m.unidad_medida}
                          </strong>{' '}
                          · mínimo {m.nivel_minimo}
                        </p>
                      </div>

                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                La alerta se genera cuando la existencia alcanza el nivel mínimo configurado.{' '}
                {inventario.alertas_pendientes > 0
                  ? `Hay ${inventario.alertas_pendientes} alertas sin atender.`
                  : 'No hay alertas pendientes de atender.'}
              </p>
            </div>
          </div>

          {/* Incidencias */}
          <div className="card bg-gradient-to-br from-white via-white to-accent-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Incidencias de obra</h3>
                  <span className="badge bg-accent-100 px-2 py-0 text-[10px] uppercase tracking-wide text-accent-700 ring-1 ring-accent-300">
                    Próximamente
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {incidencias.abiertas} sin resolver de {incidencias.total} registradas
                </p>
              </div>
              <Link
                to="/incidencias"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Ver todas <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            {incidencias.ultimas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
                <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">Sin incidencias abiertas</p>
                <p className="text-xs text-slate-500">
                  {incidencias.total === 0
                    ? 'Todavía no se ha registrado ninguna incidencia.'
                    : 'Todas las incidencias registradas están resueltas o cerradas.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {incidencias.ultimas.map((i) => {
                  const est =
                    estadoIncidente[i.estado] ?? {
                      label: i.estado,
                      cls: 'bg-slate-100 text-slate-600 ring-slate-200',
                    }
                  const sev =
                    severidadIncidente[i.severidad] ?? {
                      label: i.severidad,
                      cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
                    }
                  return (
                    <div key={i.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge ${sev.cls}`}>
                          <ExclamationTriangleIcon className="h-3 w-3" /> {sev.label}
                        </span>
                        <span className={`badge ring-1 ${est.cls}`}>{est.label}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-800">{i.proyecto}</p>
                      <p className="mt-1 text-xs font-medium text-slate-600">{i.titulo}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{i.descripcion}</p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {fmtFecha(i.fecha_incidencia)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
