import { pool } from '../db/pool.js'

/**
 * Existencia de un material en un almacén (HU-26).
 *
 * `materiales.existencia_total` es la suma de todos los almacenes; no hay una tabla de existencia por almacén,
 * así que se deriva de los movimientos: entradas (HU-19) + devoluciones aptas (HU-09) + traslados que llegan
 * (HU-29) - traslados que salen - salidas (HU-26). Las consultas usan los alias `a` (almacén) y `m` (material).
 */
const ENTRADAS = `COALESCE((SELECT SUM(d.cantidad) FROM entradas_inventario e
                              JOIN detalles_entrada_inventario d ON d.entrada_id = e.id
                             WHERE e.almacen_id = a.id AND d.material_id = m.id), 0)`
const DEVOLUCIONES = `COALESCE((SELECT SUM(v.cantidad) FROM devoluciones_materiales v
                                 WHERE v.almacen_destino_id = a.id AND v.material_id = m.id AND v.apto = 1), 0)`
const TRASLADOS_ENTRAN = `COALESCE((SELECT SUM(t.cantidad) FROM traslados_materiales t
                                     WHERE t.almacen_destino_id = a.id AND t.material_id = m.id), 0)`
const TRASLADOS_SALEN = `COALESCE((SELECT SUM(t.cantidad) FROM traslados_materiales t
                                    WHERE t.almacen_origen_id = a.id AND t.material_id = m.id), 0)`
const SALIDAS = `COALESCE((SELECT SUM(ds.cantidad_despachada) FROM salidas_materiales s
                            JOIN detalles_salida_materiales ds ON ds.salida_id = s.id
                           WHERE s.almacen_origen_id = a.id AND ds.material_id = m.id), 0)`
export const EXISTENCIA_ALMACEN_SQL = `(${ENTRADAS} + ${DEVOLUCIONES} + ${TRASLADOS_ENTRAN} - ${TRASLADOS_SALEN} - ${SALIDAS})`

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
    `SELECT x.almacen_id, x.almacen, x.material_id, x.material_codigo, x.material, x.unidad_medida, x.existencia
       FROM (SELECT a.id AS almacen_id, a.nombre AS almacen, m.id AS material_id, m.codigo AS material_codigo,
                    m.descripcion AS material, m.unidad_medida, ${EXISTENCIA_ALMACEN_SQL} AS existencia
               FROM almacenes a CROSS JOIN materiales m WHERE a.activo = 1 AND m.activo = 1) x
      WHERE x.existencia <> 0
      ORDER BY x.almacen, x.material_codigo`,
  )
  return rows.map((r) => ({ ...r, existencia: Number(r.existencia) }))
}
