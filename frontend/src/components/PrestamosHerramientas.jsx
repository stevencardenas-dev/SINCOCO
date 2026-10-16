import { ArrowPathIcon } from '@heroicons/react/24/outline'
import BotonActualizar from './BotonActualizar.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import PageHeader from './PageHeader.jsx'
import { TablaFicha } from './Ficha.jsx'
import { prestamosHerramientasApi } from '../services/prestamosHerramientas'
import { solicitudesHerramientasApi } from '../services/solicitudesHerramientas'
import { useRecurso } from '../hooks/useRecurso'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-11 (solo lectura): panel de préstamos para bodega (pestaña de Herramientas).
 * Muestra primero las solicitudes de los maestros de obra que esperan entrega
 * (pendientes y aprobadas) y debajo los préstamos registrados.
 */
const ESTADOS_SOLICITUD = {
  PENDIENTE: 'bg-amber-50 text-amber-700 ring-amber-200',
  APROBADA: 'bg-sky-50 text-sky-700 ring-sky-200',
}
const ESTADOS_PRESTAMO = {
  ACTIVO: 'bg-sky-50 text-sky-700 ring-sky-200',
  DEVUELTO: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ATRASADO: 'bg-red-50 text-red-700 ring-red-200',
  CON_NOVEDAD: 'bg-amber-50 text-amber-700 ring-amber-200',
}
const insignia = (mapa, valor) => (
  <span className={`badge ring-1 ${mapa[valor] ?? 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{valor}</span>
)

const Cargando = () => (
  <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
    <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
  </p>
)

export default function PrestamosHerramientas({ pestanas }) {
  const sol = useRecurso(() => solicitudesHerramientasApi.listar(), [], { mensaje: 'No se pudieron cargar las solicitudes.' })
  const pre = useRecurso(() => prestamosHerramientasApi.listar(), [], { mensaje: 'No se pudieron cargar los préstamos.' })

  const porEntregar = (sol.datos ?? []).filter((s) => s.estado === 'PENDIENTE' || s.estado === 'APROBADA')
  const recargar = () => Promise.all([sol.recargar(), pre.recargar()])

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargar} />} title="Herramientas" subtitle="Préstamos de herramientas y solicitudes por entregar" />
      {pestanas}

      {(sol.error || pre.error) && <AlertaFormulario mensaje={sol.error || pre.error} />}

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
          Solicitudes por entregar {sol.datos && <span className="font-normal text-slate-500">({porEntregar.length})</span>}
        </h2>
        {sol.datos === null ? (
          <Cargando />
        ) : porEntregar.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No hay solicitudes pendientes ni aprobadas.</p>
        ) : (
          <TablaFicha
            filas={porEntregar}
            minWidth="md:min-w-[860px]"
            ficha={{ titulo: (s) => s.herramienta, subtitulo: (s) => s.codigo }}
            columnas={[
              { titulo: 'Solicitud', movil: true, tdClase: 'font-medium tabular-nums text-slate-800', celda: (s) => s.codigo },
              { titulo: 'Herramienta', movil: true, tdClase: 'text-slate-700', celda: (s) => `${s.herramienta} (${s.codigo_serial})` },
              { titulo: 'Trabajador', tdClase: 'text-slate-600', celda: (s) => s.trabajador },
              { titulo: 'Proyecto', tdClase: 'text-slate-600', celda: (s) => s.proyecto },
              { titulo: 'Solicitante', tdClase: 'text-slate-600', celda: (s) => s.solicitante },
              { titulo: 'Requerida', tdClase: 'text-slate-600', celda: (s) => fmtFecha(s.fecha_requerida), orden: (s) => s.fecha_requerida },
              { titulo: 'Devolución estimada', tdClase: 'text-slate-600', celda: (s) => (s.fecha_estimada_devolucion ? fmtFecha(s.fecha_estimada_devolucion) : '—') },
              { titulo: 'Estado', movil: true, celda: (s) => insignia(ESTADOS_SOLICITUD, s.estado) },
            ]}
          />
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">Préstamos</h2>
        {pre.datos === null ? (
          <Cargando />
        ) : pre.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aún no hay préstamos registrados.</p>
        ) : (
          <TablaFicha
            filas={pre.datos}
            minWidth="md:min-w-[860px]"
            ficha={{ titulo: (p) => p.herramienta, subtitulo: (p) => p.trabajador }}
            columnas={[
              { titulo: 'Herramienta', movil: true, tdClase: 'text-slate-700', celda: (p) => `${p.herramienta} (${p.codigo_serial})` },
              { titulo: 'Trabajador', movil: true, tdClase: 'text-slate-600', celda: (p) => p.trabajador },
              { titulo: 'Proyecto', tdClase: 'text-slate-600', celda: (p) => p.proyecto },
              { titulo: 'Solicitud', tdClase: 'tabular-nums text-slate-600', celda: (p) => p.solicitud ?? '—' },
              { titulo: 'Entregada', tdClase: 'text-slate-600', celda: (p) => fmtFecha(p.fecha_prestamo), orden: (p) => p.fecha_prestamo },
              { titulo: 'Devolución estimada', tdClase: 'text-slate-600', celda: (p) => fmtFecha(p.fecha_estimada_devolucion) },
              { titulo: 'Devuelta', tdClase: 'text-slate-600', celda: (p) => (p.fecha_real_devolucion ? fmtFecha(p.fecha_real_devolucion) : '—') },
              { titulo: 'Estado', movil: true, celda: (p) => insignia(ESTADOS_PRESTAMO, p.estado_prestamo) },
            ]}
          />
        )}
      </section>
    </div>
  )
}
