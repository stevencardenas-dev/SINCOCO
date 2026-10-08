import { pool } from '../db/pool.js'

/** Repositorio de `extensiones_asignacion` (HU-31). */

/** Extensiones de una asignación, de la primera a la última. */
export async function listarPorAsignacion(asignacionId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.asignacion_id, e.fecha_fin_anterior, e.fecha_fin_nueva, e.motivo,
            e.usuario_id, u.username AS usuario, e.fecha_registro
       FROM extensiones_asignacion e LEFT JOIN usuarios u ON u.id = e.usuario_id
      WHERE e.asignacion_id = ? ORDER BY e.id`,
    [asignacionId],
  )
  return rows
}

/**
 * Otra asignación ACTIVA del trabajador que se cruce con el tramo que se
 * agrega, (`desde`, `hasta`]. Un fin nulo se toma como abierto. Misma regla de
 * solapamiento que HU-05, pero solo sobre el periodo nuevo y sin contar la
 * propia asignación.
 */
export async function solapadaConTramo(trabajadorId, excluirId, desde, hasta) {
  const [rows] = await pool.query(
    `SELECT a.id, a.fecha_inicio, a.fecha_fin_programada, p.nombre AS proyecto_nombre,
            act.nombre AS actividad_nombre
       FROM asignaciones_personal a
       JOIN proyectos p ON p.id = a.proyecto_id
       LEFT JOIN actividades act ON act.id = a.actividad_id
      WHERE a.trabajador_id = ? AND a.id <> ? AND a.estado = 'ACTIVO'
        AND a.fecha_inicio <= ?
        AND (a.fecha_fin_programada IS NULL OR a.fecha_fin_programada > ?)
      LIMIT 1`,
    [trabajadorId, excluirId, hasta, desde],
  )
  return rows[0] ?? null
}

/** Datos de la actividad y del proyecto que acotan la nueva fecha. */
export async function limitesDe(asignacionId) {
  const [rows] = await pool.query(
    `SELECT p.fecha_fin_programada AS proyecto_fin, act.fecha_fin_programada AS actividad_fin
       FROM asignaciones_personal a
       JOIN proyectos p ON p.id = a.proyecto_id
       LEFT JOIN actividades act ON act.id = a.actividad_id
      WHERE a.id = ?`,
    [asignacionId],
  )
  return rows[0] ?? null
}

/**
 * Registra la extensión y mueve la fecha fin en una sola transacción. Bloquea
 * la fila para que dos extensiones simultáneas no se pisen: solo procede si la
 * asignación sigue ACTIVA y con la fecha fin que se validó (`anterior`).
 * Devuelve el id de la extensión, o null si la asignación cambió mientras tanto.
 */
export async function extender({ asignacionId, anterior, nueva, motivo, usuarioId }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[vigente]] = await conn.query(
      'SELECT estado, DATE_FORMAT(fecha_fin_programada, "%Y-%m-%d") AS fin FROM asignaciones_personal WHERE id = ? FOR UPDATE',
      [asignacionId],
    )
    if (!vigente || vigente.estado !== 'ACTIVO' || vigente.fin !== anterior) {
      await conn.rollback()
      return null
    }
    const [r] = await conn.query(
      `INSERT INTO extensiones_asignacion (asignacion_id, fecha_fin_anterior, fecha_fin_nueva, motivo, usuario_id)
       VALUES (?, ?, ?, ?, ?)`,
      [asignacionId, anterior, nueva, motivo, usuarioId ?? null],
    )
    await conn.query('UPDATE asignaciones_personal SET fecha_fin_programada = ? WHERE id = ?', [nueva, asignacionId])
    await conn.commit()
    return r.insertId
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
