import { pool } from '../db/pool.js'
import { Cliente } from '../entities/Cliente.js'

/**
 * Repositorio de la tabla `clientes` (HU-02).
 */
export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, numero_documento, tipo_documento, razon_social_nombre, estado, activo
     FROM clientes WHERE id = ? LIMIT 1`,
    [id],
  )
  return Cliente.fromRow(rows[0])
}
