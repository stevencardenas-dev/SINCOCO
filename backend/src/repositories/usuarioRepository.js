import { pool } from '../db/pool.js'
import { Usuario } from '../entities/Usuario.js'

/**
 * Repositorio de la tabla `usuarios` (HU-02).
 */
export async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, estado, activo FROM usuarios WHERE id = ? LIMIT 1',
    [id],
  )
  return Usuario.fromRow(rows[0])
}
