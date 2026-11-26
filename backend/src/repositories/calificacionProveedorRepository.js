import { pool } from '../db/pool.js'

/**
 * Repositorio de `calificaciones_proveedor` (HU-41).
 *
 * Las calificaciones no se eliminan: `actualizar` corrige los puntajes y deja
 * la corrección en la bitácora desde el servicio.
 */

const SELECT = `SELECT c.id, c.proveedor_id, c.servicio_externo_id, c.orden_compra_id,
                       c.puntualidad, c.calidad, c.comentario, c.fecha_pactada,
                       c.fecha_cumplimiento, c.calificado_por_usuario_id, c.calificado_en,
                       c.actualizado_en,
                       COALESCE(s.nombre_servicio, o.codigo) AS referencia,
                       CASE WHEN c.servicio_externo_id IS NOT NULL THEN 'SERVICIO' ELSE 'ORDEN_COMPRA' END AS tipo,
                       s.fecha_fin AS servicio_fecha_fin,
                       o.fecha_entrega_estimada AS orden_fecha_entrega,
                       COALESCE(CONCAT(t.nombres, ' ', t.apellidos), u.username) AS calificado_por
                  FROM calificaciones_proveedor c
                  LEFT JOIN servicios_externos s ON s.id = c.servicio_externo_id
                  LEFT JOIN ordenes_compra o ON o.id = c.orden_compra_id
                  JOIN usuarios u ON u.id = c.calificado_por_usuario_id
                  LEFT JOIN trabajadores t ON t.id = u.trabajador_id`

export async function findByServicio(servicioId) {
  const [rows] = await pool.query(
    `${SELECT} WHERE c.servicio_externo_id = ? LIMIT 1`,
    [servicioId],
  )
  return rows[0] ?? null
}

export async function findByOrden(ordenId) {
  const [rows] = await pool.query(`${SELECT} WHERE c.orden_compra_id = ? LIMIT 1`, [ordenId])
  return rows[0] ?? null
}

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE c.id = ? LIMIT 1`, [id])
  return rows[0] ?? null
}

export async function crear(datos) {
  const [r] = await pool.query(
    `INSERT INTO calificaciones_proveedor
       (proveedor_id, servicio_externo_id, orden_compra_id, puntualidad, calidad,
        comentario, fecha_pactada, fecha_cumplimiento, calificado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.proveedor_id, datos.servicio_externo_id, datos.orden_compra_id,
      datos.puntualidad, datos.calidad, datos.comentario,
      datos.fecha_pactada, datos.fecha_cumplimiento, datos.calificado_por_usuario_id,
    ],
  )
  return r.insertId
}

export async function actualizar(id, { puntualidad, calidad, comentario }) {
  await pool.query(
    `UPDATE calificaciones_proveedor
        SET puntualidad = ?, calidad = ?, comentario = ?, actualizado_en = NOW()
      WHERE id = ?`,
    [puntualidad, calidad, comentario, id],
  )
}

/** Calificaciones de un proveedor, la más reciente primero. */
export async function listarPorProveedor(proveedorId) {
  const [rows] = await pool.query(
    `${SELECT} WHERE c.proveedor_id = ? ORDER BY c.calificado_en DESC, c.id DESC`,
    [proveedorId],
  )
  return rows
}

/** Promedio histórico por criterio y número de calificaciones del proveedor. */
export async function promedio(proveedorId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total,
            ROUND(AVG(puntualidad), 2) AS puntualidad,
            ROUND(AVG(calidad), 2) AS calidad
       FROM calificaciones_proveedor WHERE proveedor_id = ?`,
    [proveedorId],
  )
  const fila = rows[0] ?? {}
  return {
    total: Number(fila.total ?? 0),
    puntualidad: fila.puntualidad === null || fila.puntualidad === undefined ? null : Number(fila.puntualidad),
    calidad: fila.calidad === null || fila.calidad === undefined ? null : Number(fila.calidad),
  }
}

/**
 * Servicios finalizados y entregas recibidas del proveedor que aún no tienen
 * calificación: lo que el administrador puede calificar en este momento.
 */
export async function calificables(proveedorId) {
  const [rows] = await pool.query(
    `SELECT 'SERVICIO' AS tipo, s.id, s.nombre_servicio AS descripcion,
            s.fecha_fin AS fecha_pactada, s.valor_contratado AS valor
       FROM servicios_externos s
       LEFT JOIN calificaciones_proveedor c ON c.servicio_externo_id = s.id
      WHERE s.proveedor_id = ? AND s.estado = 'FINALIZADO' AND c.id IS NULL
     UNION ALL
     SELECT 'ORDEN_COMPRA' AS tipo, o.id, o.codigo AS descripcion,
            o.fecha_entrega_estimada AS fecha_pactada, o.monto_total AS valor
       FROM ordenes_compra o
       LEFT JOIN calificaciones_proveedor c2 ON c2.orden_compra_id = o.id
      WHERE o.proveedor_id = ? AND o.activo = 1
        AND o.estado IN ('RECIBIDA_PARCIAL', 'RECIBIDA_TOTAL') AND c2.id IS NULL
      ORDER BY fecha_pactada`,
    [proveedorId, proveedorId],
  )
  return rows.map((r) => ({ ...r, id: Number(r.id), valor: Number(r.valor) }))
}

/** Orden de compra recibida, con el proveedor y la fecha pactada. */
export async function findOrdenRecibida(id) {
  const [rows] = await pool.query(
    `SELECT id, codigo, proveedor_id, fecha_entrega_estimada, estado
       FROM ordenes_compra
      WHERE id = ? AND activo = 1 AND estado IN ('RECIBIDA_PARCIAL', 'RECIBIDA_TOTAL')
      LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}
