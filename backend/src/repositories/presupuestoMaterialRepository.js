import { pool } from '../db/pool.js'

/** Repositorio de `presupuesto_materiales_actividad`: cantidad presupuestada de cada material por actividad (HU-08). */

export async function listarPorActividad(actividadId) {
  const [rows] = await pool.query(
    `SELECT p.material_id, m.codigo AS material_codigo, m.descripcion AS material, m.unidad_medida, p.cantidad_presupuestada
       FROM presupuesto_materiales_actividad p JOIN materiales m ON m.id = p.material_id
      WHERE p.actividad_id = ? ORDER BY m.codigo`,
    [actividadId],
  )
  return rows
}

/** Materiales que se pueden presupuestar: los activos y los que la actividad ya tiene (sin existencias ni costos). */
export async function catalogo(actividadId) {
  const [rows] = await pool.query(
    `SELECT id, codigo, descripcion, unidad_medida FROM materiales
      WHERE activo = 1 OR id IN (SELECT material_id FROM presupuesto_materiales_actividad WHERE actividad_id = ?)
      ORDER BY codigo`,
    [actividadId],
  )
  return rows
}

/** Reemplaza el presupuesto de materiales de la actividad en una transacción. */
export async function reemplazar(actividadId, lineas) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM presupuesto_materiales_actividad WHERE actividad_id = ?', [actividadId])
    for (const l of lineas) {
      await conn.query(
        'INSERT INTO presupuesto_materiales_actividad (actividad_id, material_id, cantidad_presupuestada) VALUES (?, ?, ?)',
        [actividadId, l.material_id, l.cantidad],
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
