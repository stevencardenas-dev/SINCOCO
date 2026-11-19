import { pool } from '../db/pool.js'

/**
 * Repositorio de reportes (HU-25).
 *
 * Cada tipo de recurso devuelve filas homogéneas —fecha, proyecto, detalle,
 * cantidad y monto— para que la pantalla y la exportación compartan el mismo
 * formato. Solo se consultan columnas del esquema vigente.
 */

export async function proyectosParaFiltro() {
  const [rows] = await pool.query(
    'SELECT id, codigo, nombre FROM proyectos WHERE activo = 1 ORDER BY nombre',
  )
  return rows
}

const rango = (filtros) => {
  const params = []
  let sql = ''
  if (filtros.desde) {
    sql += ' AND %F >= ?'
    params.push(filtros.desde)
  }
  if (filtros.hasta) {
    sql += ' AND %F <= ?'
    params.push(`${filtros.hasta} 23:59:59`)
  }
  if (filtros.proyecto_id) {
    sql += ' AND p.id = ?'
    params.push(filtros.proyecto_id)
  }
  return { sql: (campo) => sql.replaceAll('%F', campo), params }
}

export async function materiales(filtros) {
  const r = rango(filtros)
  const [rows] = await pool.query(
    `SELECT DATE(s.fecha_salida) AS fecha, p.codigo AS proyecto_codigo, p.nombre AS proyecto,
            CONCAT('Salidas de materiales (', COUNT(*), ')') AS detalle,
            COUNT(*) AS cantidad, NULL AS monto
       FROM salidas_materiales s
       JOIN proyectos p ON p.id = s.proyecto_id
      WHERE 1 = 1 ${r.sql('s.fecha_salida')}
      GROUP BY DATE(s.fecha_salida), p.id
      ORDER BY fecha DESC, p.nombre`,
    r.params,
  )
  return rows
}

export async function servicios(filtros) {
  const r = rango(filtros)
  const [rows] = await pool.query(
    `SELECT s.fecha_inicio AS fecha, p.codigo AS proyecto_codigo, p.nombre AS proyecto,
            CONCAT(s.nombre_servicio, ' · ', s.estado) AS detalle,
            1 AS cantidad, s.valor_contratado AS monto
       FROM servicios_externos s
       JOIN proyectos p ON p.id = s.proyecto_id
      WHERE 1 = 1 ${r.sql('s.fecha_inicio')}
      ORDER BY s.fecha_inicio DESC, p.nombre`,
    r.params,
  )
  return rows
}

export async function personal(filtros) {
  const r = rango(filtros)
  const [rows] = await pool.query(
    `SELECT a.fecha_inicio AS fecha, p.codigo AS proyecto_codigo, p.nombre AS proyecto,
            CONCAT(COALESCE(a.rol_en_proyecto, 'Asignación'), ' · ', a.estado) AS detalle,
            1 AS cantidad, NULL AS monto
       FROM asignaciones_personal a
       JOIN proyectos p ON p.id = a.proyecto_id
      WHERE 1 = 1 ${r.sql('a.fecha_inicio')}
      ORDER BY a.fecha_inicio DESC, p.nombre`,
    r.params,
  )
  return rows
}

export async function costos(filtros) {
  const r = rango(filtros)
  const [rows] = await pool.query(
    `SELECT DATE(c.consolidado_en) AS fecha, p.codigo AS proyecto_codigo, p.nombre AS proyecto,
            CONCAT('Costo real · desviación ', COALESCE(CONCAT(c.desviacion_porcentaje, '%'), 'n/d')) AS detalle,
            1 AS cantidad, c.costo_real AS monto
       FROM consolidaciones_costo c
       JOIN proyectos p ON p.id = c.proyecto_id
      WHERE 1 = 1 ${r.sql('c.consolidado_en')}
      ORDER BY c.consolidado_en DESC, p.nombre`,
    r.params,
  )
  return rows
}

