import { pool } from '../db/pool.js'

/** Repositorio de `notificaciones`: avisos dirigidos a un usuario. */

export async function listar(usuarioId, { soloNoLeidas = false } = {}) {
  const [rows] = await pool.query(
    `SELECT id, titulo, mensaje, referencia_id, tabla_referencia, leida, creada_en
       FROM notificaciones WHERE usuario_id = ? ${soloNoLeidas ? 'AND leida = 0' : ''}
      ORDER BY creada_en DESC, id DESC LIMIT 50`,
    [usuarioId],
  )
  return rows
}

/** Solo marca la notificación si es del usuario. */
export async function marcarLeida(id, usuarioId) {
  const [r] = await pool.query('UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?', [id, usuarioId])
  return r.affectedRows > 0
}
