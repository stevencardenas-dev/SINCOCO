import { pool } from '../db/pool.js'

/**
 * Existencia de un material en un almacén (HU-26).
 *
 * `materiales.existencia_total` es la suma de todos los almacenes. El saldo de cada almacén vive en la tabla nexo
 * `existencias_almacen`, que mantienen triggers (entradas, salidas, devoluciones aptas y traslados): aquí solo se lee.
 * Las consultas usan los alias `a` (almacén) y `m` (material).
 */
export const EXISTENCIA_ALMACEN_SQL = `COALESCE((SELECT ea.cantidad FROM existencias_almacen ea
                                                 WHERE ea.almacen_id = a.id AND ea.material_id = m.id), 0)`

/** Existencia de un material en un almacén; `conn` permite usarla dentro de una transacción. */
export async function existenciaEnAlmacen(almacenId, materialId, conn = pool) {
  const [[r]] = await conn.query(
    `SELECT ${EXISTENCIA_ALMACEN_SQL} AS existencia FROM almacenes a JOIN materiales m ON m.id = ? WHERE a.id = ?`,
    [materialId, almacenId],
  )
  return Number(r?.existencia ?? 0)
}

/** Existencia por almacén de todos los materiales activos que tengan movimiento en el almacén (o existencia). */
export async function existenciasPorAlmacen() {
  const [rows] = await pool.query(
    `SELECT a.id AS almacen_id, a.nombre AS almacen, m.id AS material_id, m.codigo AS material_codigo,
            m.descripcion AS material, m.unidad_medida, ea.cantidad AS existencia
       FROM existencias_almacen ea
       JOIN almacenes a ON a.id = ea.almacen_id AND a.activo = 1
       JOIN materiales m ON m.id = ea.material_id AND m.activo = 1
      WHERE ea.cantidad <> 0
      ORDER BY a.nombre, m.codigo`,
  )
  return rows.map((r) => ({ ...r, existencia: Number(r.existencia) }))
}
