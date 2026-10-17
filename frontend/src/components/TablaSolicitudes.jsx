import { TablaFicha } from './Ficha.jsx'
import { fmtFecha } from '../lib/format.js'

/**
 * Tabla de solicitudes de herramientas (HU-30) compartida por la pantalla del
 * maestro de obra y el panel de préstamos de bodega. Solo muestra lo esencial;
 * el resto de los datos y las acciones viven en la ventana «Ver».
 * `acciones(solicitud)` devuelve los botones de la ventana (o null si no hay).
 */
export const ESTADOS_SOLICITUD = {
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-amber-50 text-amber-700 ring-amber-200' },
  APROBADA: { texto: 'Aprobada', clase: 'bg-sky-50 text-sky-700 ring-sky-200' },
  RECHAZADA: { texto: 'Rechazada', clase: 'bg-red-50 text-red-700 ring-red-200' },
  ENTREGADA: { texto: 'Atendida', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELADA: { texto: 'Cancelada', clase: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

export const InsigniaSolicitud = ({ estado }) => (
  <span className={`badge ring-1 ${ESTADOS_SOLICITUD[estado]?.clase ?? ''}`}>{ESTADOS_SOLICITUD[estado]?.texto ?? estado}</span>
)

export default function TablaSolicitudes({ filas, acciones }) {
  return (
    <TablaFicha
      filas={filas}
      compacta
      minWidth="md:min-w-0"
      ficha={{
        titulo: (s) => s.herramienta,
        subtitulo: (s) => s.codigo,
        etiqueta: (s) => s.codigo,
        extras: (s) => [['Estado', <InsigniaSolicitud key="e" estado={s.estado} />], ['Observaciones', s.observaciones]],
      }}
      columnas={[
        { titulo: 'Código', movil: true, tdClase: 'font-medium tabular-nums text-slate-800', celda: (s) => s.codigo },
        { titulo: 'Herramienta', movil: true, tdClase: 'text-slate-700', celda: (s) => `${s.herramienta} (${s.codigo_serial})` },
        { titulo: 'Estado', movil: true, orden: (s) => s.estado, celda: (s) => <InsigniaSolicitud estado={s.estado} /> },
        { titulo: 'Trabajador', celda: (s) => s.trabajador },
        { titulo: 'Proyecto', celda: (s) => s.proyecto },
        { titulo: 'Solicitante', celda: (s) => s.solicitante },
        { titulo: 'Solicitada', celda: (s) => fmtFecha(s.fecha_solicitud), orden: (s) => s.fecha_solicitud },
        { titulo: 'Requerida', celda: (s) => fmtFecha(s.fecha_requerida), orden: (s) => s.fecha_requerida },
        { titulo: 'Devolución estimada', celda: (s) => (s.fecha_estimada_devolucion ? fmtFecha(s.fecha_estimada_devolucion) : '—') },
        { titulo: 'Acciones', acciones: true, derecha: true, celda: (s, enFicha) => (enFicha ? acciones?.(s) ?? null : null) },
      ]}
    />
  )
}
