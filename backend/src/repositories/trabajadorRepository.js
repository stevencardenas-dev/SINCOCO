import { pool } from '../db/pool.js'
import { Trabajador } from '../entities/Trabajador.js'

/**
 * Repositorio de la tabla `trabajadores` (HU-02).
 */
export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, numero_documento, nombres, apellidos, cargo, disponible, estado, activo
     FROM trabajadores WHERE id = ? LIMIT 1`,
    [id],
  )
  return Trabajador.fromRow(rows[0])
}
