import * as asignacionRepository from '../repositories/asignacionRepository.js'
import * as trabajadorRepository from '../repositories/trabajadorRepository.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-06 · historial de asignaciones de un trabajador.
 *
 * Es una consulta de solo lectura: no cambia estados ni escribe bitácora.
 * Ordena de la asignación más antigua a la más reciente y, por omisión, oculta
 * las asignaciones a proyectos dados de baja lógica; el filtro
 * `incluir_inactivos` las trae de vuelta (criterio 4).
 *
 * El documento descargable se arma aquí mismo: un HTML autónomo con los
 * filtros aplicados y la fecha de generación, que el navegador guarda o imprime
 * a PDF sin añadir dependencias al backend.
 */

/** Escapa texto para incrustarlo en el documento sin romper el HTML. */
const esc = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const TITULO_ESTADO = {
  ACTIVO: 'Activo',
  FINALIZADO: 'Finalizado',
  REASIGNADO: 'Reasignado',
  CANCELADO: 'Cancelado',
}

const fecha = (valor) => (valor ? String(valor).slice(0, 10) : '—')

/** Valida el identificador y devuelve el trabajador; lanza 400/404 si no sirve. */
async function trabajadorDeId(trabajadorId) {
  const id = Number(trabajadorId)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('El trabajador indicado no es válido', 400, 'trabajador_id')
  }
  const trabajador = await trabajadorRepository.findById(id)
  if (!trabajador) throw new AppError('El trabajador no existe', 404, 'trabajador_id')
  return trabajador
}

/**
 * Historial completo de un trabajador.
 * Devuelve el trabajador, sus asignaciones ordenadas y los filtros aplicados,
 * para que la pantalla pueda rotular lo que está mostrando.
 */
export async function historialDeTrabajador(trabajadorId, { incluirInactivos = false } = {}) {
  const trabajador = await trabajadorDeId(trabajadorId)
  const asignaciones = await asignacionRepository.historialTrabajador(Number(trabajadorId), {
    incluirInactivos,
  })
  return {
    trabajador: {
      id: Number(trabajador.id),
      nombres: trabajador.nombres,
      apellidos: trabajador.apellidos,
      tipo_documento: trabajador.tipo_documento,
      numero_documento: trabajador.numero_documento,
      cargo: trabajador.cargo ?? null,
    },
    asignaciones,
    filtros: { incluir_inactivos: Boolean(incluirInactivos) },
    total: asignaciones.length,
  }
}

/**
 * Documento imprimible del historial (criterio 3: exportar a un formato de
 * documento). Incluye encabezado con el trabajador, los filtros aplicados y la
 * fecha y hora de generación, igual que el resto de reportes del sistema.
 */
export function documentoHistorial(historial, { generadoEn = new Date() } = {}) {
  const { trabajador, asignaciones, filtros } = historial
  const nombre = `${trabajador.nombres} ${trabajador.apellidos}`.trim()
  const documento = `${trabajador.tipo_documento ?? ''} ${trabajador.numero_documento ?? ''}`.trim()
  const sello = generadoEn.toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const filas = asignaciones.length
    ? asignaciones
        .map(
          (a) => `        <tr>
          <td>${esc(a.proyecto_nombre)}${a.proyecto_activo === 0 ? ' <span class="baja">(dado de baja)</span>' : ''}</td>
          <td>${esc(a.actividad_nombre ?? 'Todo el proyecto')}</td>
          <td>${esc(a.rol_en_proyecto ?? '—')}</td>
          <td class="num">${esc(fecha(a.fecha_inicio))}</td>
          <td class="num">${esc(fecha(a.fecha_fin_programada))}</td>
          <td class="num">${esc(fecha(a.fecha_fin_real))}</td>
          <td>${esc(TITULO_ESTADO[a.estado] ?? a.estado)}</td>
        </tr>`,
        )
        .join('\n')
    : '        <tr><td colspan="7" class="vacio">Sin asignaciones registradas.</td></tr>'

  const contenido = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Historial de asignaciones · ${esc(nombre)}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 32px; color: #1e293b; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 12px; margin: 0; }
  .filtros { margin: 20px 0 8px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; }
  .filtros strong { color: #334155; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .baja { color: #b91c1c; font-size: 11px; }
  .vacio { text-align: center; color: #94a3b8; padding: 18px; }
  footer { margin-top: 18px; font-size: 11px; color: #94a3b8; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <h1>Historial de asignaciones</h1>
  <p class="sub">${esc(nombre)}${documento ? ` · ${esc(documento)}` : ''}${trabajador.cargo ? ` · ${esc(trabajador.cargo)}` : ''}</p>
  <div class="filtros">
    <strong>Filtros aplicados:</strong>
    proyectos dados de baja ${filtros?.incluir_inactivos ? 'incluidos' : 'excluidos'} ·
    ${asignaciones.length} ${asignaciones.length === 1 ? 'asignación' : 'asignaciones'} ·
    <strong>Generado:</strong> ${esc(sello)}
  </div>
  <table>
    <thead>
      <tr><th>Proyecto</th><th>Actividad</th><th>Rol</th><th>Inicio</th><th>Fin programado</th><th>Fin real</th><th>Estado</th></tr>
    </thead>
    <tbody>
${filas}
    </tbody>
  </table>
  <footer>SINCOCO · historial de asignaciones del trabajador · proyecto AYD.</footer>
</body>
</html>
`

  const sufijo = String(trabajador.numero_documento ?? trabajador.id).replace(/[^\w-]/g, '')
  return { nombreArchivo: `historial-asignaciones-${sufijo}.html`, contenido }
}
