import { pool } from '../db/pool.js'

/** Repositorio de `traslados_materiales` (HU-29). El comprobante consecutivo se deriva del id: TR-00001. */

const SELECT = `SELECT t.id, CONCAT('TR-', LPAD(t.id, 5, '0')) AS comprobante,
                       t.almacen_origen_id, ao.nombre AS almacen_origen, t.almacen_destino_id, ad.nombre AS almacen_destino,
                       t.material_id, m.codigo AS material_codigo, m.descripcion AS material, m.unidad_medida,
                       t.cantidad,
                       t.responsable_usuario_id, COALESCE(CONCAT(tr.nombres, ' ', tr.apellidos), u.username) AS responsable,
                       t.fecha_traslado, t.observaciones
                  FROM traslados_materiales t
                  JOIN almacenes ao ON ao.id = t.almacen_origen_id
                  JOIN almacenes ad ON ad.id = t.almacen_destino_id
                  JOIN materiales m ON m.id = t.material_id
                  JOIN usuarios u ON u.id = t.responsable_usuario_id
                  LEFT JOIN trabajadores tr ON tr.id = u.trabajador_id`

export async function listar() {
  const [rows] = await pool.query(`${SELECT} ORDER BY t.fecha_traslado DESC, t.id DESC`)
  return rows
}

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE t.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

/** Almacenes y materiales activos para el formulario de traslado. */
export async function opciones() {
  const [almacenes] = await pool.query('SELECT id, codigo, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre')
  const [materiales] = await pool.query(
    'SELECT id, codigo, descripcion, unidad_medida FROM materiales WHERE activo = 1 ORDER BY codigo',
  )
  return { almacenes, materiales }
}

/** Registra el traslado en una transacción; `validar` revisa almacenes y material antes de guardar. */
export async function registrar({ origenId, destinoId, materialId, cantidad, usuarioId, observaciones, validar }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[origen]] = await conn.query('SELECT * FROM almacenes WHERE id = ?', [origenId])
    const [[destino]] = await conn.query('SELECT * FROM almacenes WHERE id = ?', [destinoId])
    const [[material]] = await conn.query('SELECT * FROM materiales WHERE id = ? FOR UPDATE', [materialId])
    validar({ origen, destino, material })

    const [ins] = await conn.query(
      `INSERT INTO traslados_materiales
         (almacen_origen_id, almacen_destino_id, material_id, cantidad, responsable_usuario_id, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [origenId, destinoId, materialId, cantidad, usuarioId, observaciones],
    )
    await conn.commit()
    return ins.insertId
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
