import * as repo from '../repositories/reporteRepository.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-25 · reportes exportables.
 *
 * Filtros: rango de fechas, proyecto y tipo de recurso. Devuelve filas
 * homogéneas y sabe exportarlas a CSV (Excel en es-CO, separador `;`) y a un
 * documento HTML imprimible. El encabezado del archivo repite los filtros y la
 * fecha de generación, como pide el criterio.
 */

export const TIPOS = {
  MATERIALES: 'Salidas de materiales',
  SERVICIOS: 'Servicios externos',
  PERSONAL: 'Personal asignado',
  COSTOS: 'Costo consolidado',
}

/** Cada tipo de recurso se resuelve con su consulta del repositorio. */
const CONSULTAS = {
  MATERIALES: repo.materiales,
  SERVICIOS: repo.servicios,
  PERSONAL: repo.personal,
  COSTOS: repo.costos,
}

const COLUMNAS = [
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'proyecto_codigo', titulo: 'Código' },
  { clave: 'proyecto', titulo: 'Proyecto' },
  { clave: 'detalle', titulo: 'Detalle' },
  { clave: 'cantidad', titulo: 'Cantidad' },
  { clave: 'monto', titulo: 'Monto' },
]

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

export function normalizarFiltros(filtros = {}) {
  const tipo = String(filtros.tipo ?? 'COSTOS').toUpperCase()
  if (!TIPOS[tipo]) {
    throw new AppError(`Tipo de recurso no válido. Use ${Object.keys(TIPOS).join(', ')}`, 400, 'tipo')
  }
  const desde = String(filtros.desde ?? '').trim()
  const hasta = String(filtros.hasta ?? '').trim()
  for (const [campo, valor] of [['desde', desde], ['hasta', hasta]]) {
    if (valor && !ES_FECHA.test(valor)) {
      throw new AppError('Las fechas van en formato AAAA-MM-DD', 400, campo)
    }
  }
  if (desde && hasta && desde > hasta) {
    throw new AppError('La fecha inicial no puede ser posterior a la final', 400, 'desde')
  }
  const proyectoId = filtros.proyecto_id ? Number(filtros.proyecto_id) : null
  if (proyectoId !== null && (!Number.isInteger(proyectoId) || proyectoId <= 0)) {
    throw new AppError('Proyecto no válido', 400, 'proyecto_id')
  }
  return { tipo, desde, hasta, proyecto_id: proyectoId }
}

const fecha = (valor) => {
  if (!valor) return ''
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? String(valor).slice(0, 10) : d.toISOString().slice(0, 10)
}

const numero = (valor) => (valor === null || valor === undefined || valor === '' ? '' : Number(valor))

export async function generar(filtrosEntrada = {}) {
  const filtros = normalizarFiltros(filtrosEntrada)
  const filas = await CONSULTAS[filtros.tipo](filtros)
  const totales = {
    filas: filas.length,
    cantidad: filas.reduce((s, f) => s + Number(f.cantidad ?? 0), 0),
    monto: filas.reduce((s, f) => s + Number(f.monto ?? 0), 0),
  }
  return {
    filtros: { ...filtros, etiquetaTipo: TIPOS[filtros.tipo] },
    columnas: COLUMNAS,
    filas: filas.map((f) => ({ ...f, fecha: fecha(f.fecha), monto: numero(f.monto) })),
    totales,
    generado_en: new Date().toISOString(),
  }
}

export async function proyectos() {
  return repo.proyectosParaFiltro()
}

const celda = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`
const dinero = (valor) =>
  valor === '' || valor === null ? '' : Number(valor).toFixed(2).replace('.', ',')

export function aCsv(reporte) {
  const lineas = []
  lineas.push(celda(`Reporte: ${reporte.filtros.etiquetaTipo}`))
  lineas.push(celda(`Desde: ${reporte.filtros.desde || 'sin límite'} · Hasta: ${reporte.filtros.hasta || 'sin límite'}`))
  lineas.push(celda(`Generado: ${reporte.generado_en.slice(0, 19).replace('T', ' ')}`))
  lineas.push('')
  lineas.push(reporte.columnas.map((c) => celda(c.titulo)).join(';'))
  for (const fila of reporte.filas) {
    lineas.push(
      reporte.columnas
        .map((c) => celda(c.clave === 'monto' ? dinero(fila[c.clave]) : fila[c.clave]))
        .join(';'),
    )
  }
  lineas.push('')
  lineas.push(celda(`Total filas: ${reporte.totales.filas} · Monto: ${dinero(reporte.totales.monto)}`))
  return lineas.join('\r\n')
}

export function aHtml(reporte) {
  const filtros = [
    `Tipo: ${reporte.filtros.etiquetaTipo}`,
    `Desde: ${reporte.filtros.desde || 'sin límite'}`,
    `Hasta: ${reporte.filtros.hasta || 'sin límite'}`,
    `Proyecto: ${reporte.filtros.proyecto_id ?? 'todos'}`,
    `Generado: ${reporte.generado_en.slice(0, 19).replace('T', ' ')}`,
  ]
  const filas = reporte.filas
    .map(
      (f) =>
        `<tr>${reporte.columnas
          .map((c) => `<td>${f[c.clave] === '' || f[c.clave] === null ? '—' : String(f[c.clave])}</td>`)
          .join('')}</tr>`,
    )
    .join('\n')
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Reporte ${reporte.filtros.etiquetaTipo}</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;margin:24px;color:#0f172a}
  h1{font-size:18px;margin:0 0 4px}
  ul{list-style:none;padding:0;margin:0 0 16px;font-size:12px;color:#475569;display:flex;flex-wrap:wrap;gap:12px}
  table{border-collapse:collapse;width:100%;font-size:12px}
  th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
  th{background:#f1f5f9}
  tfoot td{font-weight:600;background:#f8fafc}
  @media print{body{margin:8mm}}
</style></head>
<body>
  <h1>SINCOCO · Reporte de ${reporte.filtros.etiquetaTipo}</h1>
  <ul>${filtros.map((f) => `<li>${f}</li>`).join('')}</ul>
  <table>
    <thead><tr>${reporte.columnas.map((c) => `<th>${c.titulo}</th>`).join('')}</tr></thead>
    <tbody>${filas || '<tr><td colspan="6">Sin datos para los filtros elegidos.</td></tr>'}</tbody>
    <tfoot><tr><td colspan="4">Total</td><td>${reporte.totales.filas}</td><td>${reporte.totales.monto}</td></tr></tfoot>
  </table>
</body></html>`
}

export async function exportar(filtros, formato = 'csv') {
  const reporte = await generar(filtros)
  const base = `reporte-${reporte.filtros.tipo.toLowerCase()}-${reporte.generado_en.slice(0, 10)}`
  if (String(formato).toLowerCase() === 'html') {
    return { nombre: `${base}.html`, tipo: 'text/html; charset=utf-8', contenido: aHtml(reporte) }
  }
  return { nombre: `${base}.csv`, tipo: 'text/csv; charset=utf-8', contenido: `\uFEFF${aCsv(reporte)}` }
}
