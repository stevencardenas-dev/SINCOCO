import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { costosApi } from '../services/costos'
import { useRecurso } from '../hooks/useRecurso'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-15 · costo real consolidado por proyecto.
 *
 * Muestra, por proyecto, el presupuesto inicial, el costo real del último corte
 * (materiales despachados + servicios externos + órdenes de compra) y la
 * desviación porcentual. Consolidar guarda un corte nuevo; el proyecto que
 * nunca se ha consolidado se ve como «Sin consolidar» y no ensucia al resto.
 */
const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'PLANIFICACION', etiqueta: 'Planificación' },
  { valor: 'EN_EJECUCION', etiqueta: 'En ejecución' },
  { valor: 'PAUSADO', etiqueta: 'Congelado' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado' },
]

const moneda = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor ?? 0))

/** Semáforo de la desviación: sin presupuesto o sin corte, gris. */
function Desviacion({ valor }) {
  if (valor === null || valor === undefined) {
    return <span className="text-xs text-slate-400">Sin consolidar</span>
  }
  const clase =
    valor > 20
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : valor > 0
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${clase}`}>
      {valor > 0 ? '+' : ''}
      {Number(valor).toFixed(2)}%
    </span>
  )
}

const ESTADO_LABEL = {
  PLANIFICACION: 'Planificación',
  EN_EJECUCION: 'En ejecución',
  PAUSADO: 'Congelado',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

export default function Costos() {
  const { puede } = useAuth()
  const puedeConsolidar = puede('proyectos.editar')
  const [estado, setEstado] = useState('')
  const costos = useRecurso(() => costosApi.resumen({ estado }), [estado], {
    mensaje: 'No se pudieron cargar los costos.',
  })

  const consolidar = (p) =>
    costos.ejecutar(() => costosApi.consolidar(p.id), {
      exito: `Costo de ${p.codigo} consolidado.`,
      error: 'No se pudo consolidar el costo del proyecto.',
    })

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={costos.recargar} />}
        title="Costos por proyecto"
        subtitle="Costo real consolidado frente al presupuesto inicial"
      />

      <div className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e.etiqueta}
            type="button"
            className={estado === e.valor ? 'btn-primary text-xs' : 'btn-ghost text-xs'}
            onClick={() => setEstado(e.valor)}
          >
            {e.etiqueta}
          </button>
        ))}
      </div>

      {costos.error && <AlertaFormulario mensaje={costos.error} />}
      {costos.aviso && <AlertaFormulario tipo="aviso" mensaje={costos.aviso} />}

      <section className="card overflow-hidden">
        {costos.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : costos.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No hay proyectos con ese estado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Proyecto</th>
                  <th className="px-4 py-2 font-semibold">Estado</th>
                  <th className="px-4 py-2 text-right font-semibold">Presupuesto</th>
                  <th className="px-4 py-2 text-right font-semibold">Costo real</th>
                  <th className="px-4 py-2 font-semibold">Desviación</th>
                  <th className="px-4 py-2 font-semibold">Última consolidación</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {costos.datos.map((p) => (
                  <tr key={p.id} className="align-middle">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-800">{p.nombre}</p>
                      <p className="text-xs text-slate-500">{p.codigo}</p>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{ESTADO_LABEL[p.estado] ?? p.estado}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                      {moneda(p.presupuesto_inicial)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium text-slate-800">
                      {p.costo_real === null ? '—' : moneda(p.costo_real)}
                    </td>
                    <td className="px-4 py-2">
                      <Desviacion valor={p.desviacion_porcentaje} />
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {p.consolidado_en ? fmtFecha(p.consolidado_en) : 'Nunca'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {puedeConsolidar && (
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => consolidar(p)}
                        >
                          Consolidar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        El costo real suma materiales despachados (cantidad × costo al momento), servicios externos
        contratados y órdenes de compra vigentes. La desviación se calcula contra el presupuesto
        inicial del proyecto.
      </p>
    </div>
  )
}
