import { pool } from '../db/pool.js'
import { ServicioExterno } from '../entities/ServicioExterno.js'

/** Repositorio de la tabla `servicios_externos` (HU-28). */

const SELECT_BASE = `
  SELECT s.id, s.proveedor_id, s.proyecto_id, s.actividad_id, s.nombre_servicio,
         s.descripcion, s.responsable_externo, s.fecha_inicio, s.fecha_fin,
         s.valor_contratado, s.estado, s.observaciones, s.creado_en,
         pv.razon_social AS proveedor_nombre,
         p.codigo AS proyecto_codigo, p.nombre AS proyecto_nombre,
         a.nombre AS actividad_nombre
  FROM servicios_externos s
  JOIN proveedores pv ON pv.id = s.proveedor_id
  JOIN proyectos p ON p.id = s.proyecto_id
  LEFT JOIN actividades a ON a.id = s.actividad_id
`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE s.id = ? LIMIT 1`, [id])
  return ServicioExterno.fromRow(rows[0])
}

/** Servicios con filtros opcionales (proyecto, actividad, proveedor, estado), los más recientes primero. */
export async function listar({ proyectoId, actividadId, proveedorId, estado } = {}) {
  const condiciones = []
  const params = []
  for (const [columna, valor] of [
    ['proyecto_id', proyectoId], ['actividad_id', actividadId],
    ['proveedor_id', proveedorId], ['estado', estado],
  ]) {
    if (valor) {
      condiciones.push(`s.${columna} = ?`)
      params.push(valor)
    }
  }
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [rows] = await pool.query(
    `${SELECT_BASE} ${where} ORDER BY s.fecha_inicio DESC, s.id DESC`,
    params,
  )
  return rows.map(ServicioExterno.fromRow)
}

export async function create(s) {
  const [result] = await pool.query(
    `INSERT INTO servicios_externos
       (proveedor_id, proyecto_id, actividad_id, nombre_servicio, descripcion,
        responsable_externo, fecha_inicio, fecha_fin, valor_contratado, estado, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.proveedor_id, s.proyecto_id, s.actividad_id, s.nombre_servicio, s.descripcion,
      s.responsable_externo, s.fecha_inicio, s.fecha_fin, s.valor_contratado, s.estado, s.observaciones,
    ],
  )
  return result.insertId
}

/** Lo ya contratado en una actividad; un servicio cancelado libera su presupuesto. */
export async function totalContratadoActividad(actividadId) {
  const [[fila]] = await pool.query(
    `SELECT COALESCE(SUM(valor_contratado), 0) AS total
       FROM servicios_externos WHERE actividad_id = ? AND estado <> 'CANCELADO'`,
    [actividadId],
  )
  return Number(fila.total)
}
