import { pool } from '../db/pool.js'

/** Repositorio de `entradas_inventario` y sus detalles (HU-19). */

const SELECT = `SELECT e.id, CONCAT('EN-', LPAD(e.id, 5, '0')) AS comprobante, e.almacen_id, a.nombre AS almacen,
                       e.proveedor_id, p.razon_social AS proveedor, e.responsable_usuario_id, u.username AS responsable,
                       e.numero_factura_remision, e.orden_compra_id, oc.codigo AS orden_compra,
                       e.fecha_entrada, e.costo_total, e.observaciones
                  FROM entradas_inventario e
                  JOIN almacenes a ON a.id = e.almacen_id
                  JOIN proveedores p ON p.id = e.proveedor_id
                  JOIN usuarios u ON u.id = e.responsable_usuario_id
                  LEFT JOIN ordenes_compra oc ON oc.id = e.orden_compra_id`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE e.id = ? LIMIT 1`, [id])
  if (!rows[0]) return null
  const [detalles] = await pool.query(
    `SELECT d.id, d.material_id, m.codigo AS material_codigo, m.descripcion AS material, m.unidad_medida,
            d.cantidad, d.costo_unitario, d.costo_subtotal
       FROM detalles_entrada_inventario d JOIN materiales m ON m.id = d.material_id
      WHERE d.entrada_id = ? ORDER BY d.id`,
    [id],
  )
  return { ...rows[0], detalles }
}

export async function listar() {
  const [rows] = await pool.query(`${SELECT} ORDER BY e.fecha_entrada DESC, e.id DESC`)
  return rows
}

/** Órdenes de compra que todavía pueden recibir mercancía, con lo pendiente por línea. */
export async function ordenesRecibibles() {
  const [ordenes] = await pool.query(
    `SELECT oc.id, oc.codigo, oc.proveedor_id, p.razon_social AS proveedor, oc.estado
       FROM ordenes_compra oc JOIN proveedores p ON p.id = oc.proveedor_id
      WHERE oc.activo = 1 AND oc.estado IN ('APROBADA', 'ENVIADA_PROVEEDOR', 'RECIBIDA_PARCIAL')
      ORDER BY oc.fecha_emision DESC`,
  )
  if (ordenes.length === 0) return []
  const [lineas] = await pool.query(
    `SELECT d.id, d.orden_compra_id, d.material_id, m.codigo AS material_codigo, m.descripcion AS material,
            d.cantidad_pedida, d.cantidad_recibida, d.precio_unitario
       FROM detalles_orden_compra d JOIN materiales m ON m.id = d.material_id
      WHERE d.orden_compra_id IN (?)`,
    [ordenes.map((o) => o.id)],
  )
  return ordenes.map((o) => ({ ...o, detalles: lineas.filter((l) => l.orden_compra_id === o.id) }))
}

/**
 * Registra la entrada completa en una transacción: cabecera, detalles (el trigger
 * trg_entrada_suma_existencia suma la existencia), costo de referencia del material
 * (promedio ponderado) y, si viene de una orden de compra, cantidad recibida y estado.
 * `validar({ almacen, proveedor, materiales, orden, lineasOrden })` lanza si no procede.
 */
export async function registrar({ almacenId, proveedorId, usuarioId, numero, ordenId, observaciones, detalles, validar }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[almacen]] = await conn.query('SELECT * FROM almacenes WHERE id = ?', [almacenId])
    const [[proveedor]] = await conn.query('SELECT * FROM proveedores WHERE id = ?', [proveedorId])
    const ids = [...new Set(detalles.map((d) => d.material_id))]
    const [materiales] = await conn.query('SELECT * FROM materiales WHERE id IN (?) FOR UPDATE', [ids])
    let orden = null
    let lineasOrden = []
    if (ordenId) {
      ;[[orden]] = await conn.query('SELECT * FROM ordenes_compra WHERE id = ? FOR UPDATE', [ordenId])
      ;[lineasOrden] = await conn.query('SELECT * FROM detalles_orden_compra WHERE orden_compra_id = ? FOR UPDATE', [ordenId])
    }
    validar({ almacen, proveedor, materiales, orden, lineasOrden })

    const costoTotal = detalles.reduce((s, d) => s + Math.round(d.cantidad * d.costo_unitario * 100) / 100, 0)
    const [ins] = await conn.query(
      `INSERT INTO entradas_inventario
         (almacen_id, proveedor_id, responsable_usuario_id, numero_factura_remision, orden_compra_id, costo_total, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [almacenId, proveedorId, usuarioId, numero, ordenId ?? null, costoTotal, observaciones],
    )
    for (const d of detalles) {
      const mat = materiales.find((m) => Number(m.id) === d.material_id)
      const subtotal = Math.round(d.cantidad * d.costo_unitario * 100) / 100
      // Promedio ponderado con la existencia previa (antes de que el trigger sume).
      const [[previa]] = await conn.query('SELECT existencia_total, costo_referencia FROM materiales WHERE id = ?', [d.material_id])
      const existenciaPrevia = Number(previa.existencia_total)
      const nuevoCosto = existenciaPrevia > 0
        ? (existenciaPrevia * Number(previa.costo_referencia) + d.cantidad * d.costo_unitario) / (existenciaPrevia + d.cantidad)
        : d.costo_unitario
      await conn.query(
        `INSERT INTO detalles_entrada_inventario (entrada_id, material_id, cantidad, costo_unitario, costo_subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [ins.insertId, d.material_id, d.cantidad, d.costo_unitario, subtotal],
      )
      await conn.query('UPDATE materiales SET costo_referencia = ? WHERE id = ?', [Math.round(nuevoCosto * 100) / 100, mat.id])
    }
    if (orden) {
      for (const d of detalles) {
        await conn.query(
          'UPDATE detalles_orden_compra SET cantidad_recibida = cantidad_recibida + ? WHERE orden_compra_id = ? AND material_id = ?',
          [d.cantidad, ordenId, d.material_id],
        )
      }
      const [[pendiente]] = await conn.query(
        'SELECT COUNT(*) AS n FROM detalles_orden_compra WHERE orden_compra_id = ? AND cantidad_recibida < cantidad_pedida',
        [ordenId],
      )
      await conn.query('UPDATE ordenes_compra SET estado = ? WHERE id = ?', [Number(pendiente.n) === 0 ? 'RECIBIDA_TOTAL' : 'RECIBIDA_PARCIAL', ordenId])
    }
    await conn.commit()
    return ins.insertId
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/** Proveedores activos para el selector del ingreso (id y razón social, nada más). */
export async function proveedoresActivos() {
  const [rows] = await pool.query('SELECT id, razon_social FROM proveedores WHERE activo = 1 ORDER BY razon_social')
  return rows
}
