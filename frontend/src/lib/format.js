/**
 * Formateadores compartidos del frontend.
 * Centralizados para que todas las páginas usen el mismo formato (es-CO).
 */

export const fmtCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export const fmtFecha = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dia = d.toLocaleDateString('es-CO', { day: 'numeric' })
  const mes = d.toLocaleDateString('es-CO', { month: 'short' })
  const anio = d.toLocaleDateString('es-CO', { year: 'numeric' })
  return `${dia} ${mes} ${anio}`
}

export const estadoIncidente = {
  abierta: { label: 'Abierta', cls: 'bg-red-50 text-red-700 ring-red-200' },
  en_gestion: { label: 'En gestión', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  cerrada: { label: 'Cerrada', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export const estadoProyecto = {
  planificacion: { label: 'Planificación', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  en_ejecucion: { label: 'En ejecución', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pausado: { label: 'Pausado', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  finalizado: { label: 'Finalizado', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}