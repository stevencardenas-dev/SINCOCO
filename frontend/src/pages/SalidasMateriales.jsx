import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { salidasMaterialesApi } from '../services/salidasMateriales'
import { useRecurso } from '../hooks/useRecurso'
import { fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * HU-26 (CU-26): salida efectiva de materiales.
 * Constancia de lo despachado: almacén de origen, proyecto, actividad, quién despacha, a quién se entrega y, por cada
 * material, la cantidad y el costo unitario al momento de la salida. Las salidas se registran al despachar una solicitud
 * aprobada (Solicitudes → Materiales), que valida la existencia del almacén de origen. Abajo, la existencia por almacén.
 */
export default function SalidasMateriales() {
  const salidas = useRecurso(() => salidasMaterialesApi.listar(), [], { mensaje: 'No se pudieron cargar las salidas.' })
  const existencias = useRecurso(() => salidasMaterialesApi.existencias(), [], { mensaje: 'No se pudo cargar la existencia por almacén.' })
  const recargar = () => Promise.all([salidas.recargar(), existencias.recargar()])

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargar} />} title="Salidas de materiales" subtitle="Constancia de lo despachado a proyectos y actividades" />
      {salidas.error && <AlertaFormulario mensaje={salidas.error} />}
      {existencias.error && <AlertaFormulario mensaje={existencias.error} />}
      <p className="text-xs text-slate-500">Para registrar una salida, despache una solicitud aprobada desde Solicitudes → Materiales.</p>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">Existencia por almacén</h2>
        {existencias.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : existencias.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No hay existencias registradas en los almacenes.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {existencias.datos.map((x) => (
              <li key={`${x.almacen_id}-${x.material_id}`} className="flex flex-wrap justify-between gap-2 px-5 py-2">
                <span className="text-slate-700">{x.almacen} · {x.material_codigo} · {x.material}</span>
                <span className="tabular-nums text-slate-600">{x.existencia} {x.unidad_medida}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">Salidas</h2>
        {salidas.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : salidas.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aún no hay salidas registradas.</p>
        ) : (
          <TablaFicha
            filas={salidas.datos}
            compacta
            minWidth="md:min-w-0"
            ficha={{ titulo: (s) => s.comprobante, subtitulo: (s) => s.proyecto }}
            columnas={[
              { titulo: 'Comprobante', movil: true, celda: (s) => s.comprobante },
              { titulo: 'Proyecto', movil: true, celda: (s) => s.proyecto },
              { titulo: 'Costo total', movil: true, celda: (s) => fmtCOP(s.costo_total) },
              { titulo: 'Solicitud', celda: (s) => s.solicitud ?? '—' },
              { titulo: 'Actividad', celda: (s) => s.actividad ?? '—' },
              { titulo: 'Almacén de origen', celda: (s) => s.almacen_origen },
              { titulo: 'Despachó', celda: (s) => s.despachado_por },
              { titulo: 'Entregado a', celda: (s) => s.entregado_a },
              {
                titulo: 'Materiales',
                celda: (s) => s.detalles.map((d) => (
                  <span key={d.material_id} className="block">
                    {d.material_codigo} · {d.material}: {Number(d.cantidad_despachada)} {d.unidad_medida} × {fmtCOP(d.costo_unitario_momento)} = {fmtCOP(d.subtotal)}
                  </span>
                )),
              },
              { titulo: 'Observaciones', celda: (s) => s.observaciones || '—' },
              { titulo: 'Fecha', celda: (s) => fmtFecha(s.fecha_salida), orden: (s) => s.fecha_salida },
            ]}
          />
        )}
      </section>
    </div>
  )
}
