/**
 * Formateadores compartidos del frontend.
 * Centralizados para que todas las páginas usen el mismo formato (es-CO).
 */

export const fmtCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

/**
 * Monto abreviado para tarjetas e indicadores, donde no cabe el peso completo:
 * 850.000.000 -> "$ 850 M" y 1.250.000.000 -> "$ 1,3 B". Se aproxima a una
 * cifra decimal y quien necesite el valor exacto lo ve en el `title`.
 */
export const fmtCOPCompacto = (n) => {
  const valor = Number(n) || 0
  const abs = Math.abs(valor)
  const corto = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
  if (abs >= 1_000_000_000) return `$ ${corto.format(valor / 1_000_000_000)} B`
  if (abs >= 1_000_000) return `$ ${corto.format(valor / 1_000_000)} M`
  return fmtCOP(valor)
}

/**
 * Una fecha sin hora ('2026-03-01') se interpreta como día local: con
 * `new Date('2026-03-01')` JavaScript la toma como medianoche UTC y en
 * Colombia (UTC-5) se vería el día anterior.
 */
const aFecha = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso)
}

export const fmtFecha = (iso) => {
  const d = aFecha(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dia = d.toLocaleDateString('es-CO', { day: 'numeric' })
  const mes = d.toLocaleDateString('es-CO', { month: 'short' })
  const anio = d.toLocaleDateString('es-CO', { year: 'numeric' })
  return `${dia} ${mes} ${anio}`
}

/**
 * Monto a partir de lo que escribió el usuario: solo se conservan los dígitos,
 * para que los puntos o comas que teclee no rompan el valor.
 */
export const soloDigitos = (texto) => String(texto ?? '').replace(/\D/g, '')

/** Separa los miles con punto, como se escribe el peso en Colombia: 850.000.000. */
export const fmtMiles = (monto) => {
  const digitos = soloDigitos(monto).replace(/^0+(?=\d)/, '')
  return digitos === '' ? '' : new Intl.NumberFormat('es-CO').format(Number(digitos))
}

/**
 * Lee un monto en palabras para no confundir la magnitud al capturarlo:
 * 850.000.000 -> "850 millones", 15.000 -> "15 mil".
 */
export const montoEnPalabras = (monto) => {
  const n = Number(soloDigitos(monto) || 0)
  if (!n) return ''
  const corto = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
  if (n >= 1_000_000_000) return `${corto.format(n / 1_000_000_000)} mil millones`
  if (n >= 1_000_000) return `${corto.format(n / 1_000_000)} millones`
  if (n >= 1_000) return `${corto.format(n / 1_000)} mil`
  return `${n} pesos`
}

export const fmtFechaHora = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// Valores reales de `incidencias.estado` (docs/schema.sql), no etiquetas de demo.
export const estadoIncidente = {
  ABIERTA: { label: 'Abierta', cls: 'bg-red-50 text-red-700 ring-red-200' },
  EN_REVISION: { label: 'En revisión', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  RESUELTA: { label: 'Resuelta', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CERRADA: { label: 'Cerrada', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

// Severidad de una incidencia (HU-14).
export const severidadIncidente = {
  CRITICA: { label: 'Crítica', cls: 'bg-red-100 text-red-700 ring-1 ring-red-200' },
  ALTA: { label: 'Alta', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  MEDIA: { label: 'Media', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  BAJA: { label: 'Baja', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
}

export const estadoProyecto = {
  planificacion: { label: 'Planificación', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  en_ejecucion: { label: 'En ejecución', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pausado: { label: 'Pausado', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  finalizado: { label: 'Finalizado', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  cancelado: { label: 'Cancelado', cls: 'bg-red-50 text-red-700 ring-red-200' },
}