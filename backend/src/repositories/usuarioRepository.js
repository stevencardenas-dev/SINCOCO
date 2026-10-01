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

/**
 * Datos mínimos para resolver el alcance de acceso: el rol y la ficha de
 * trabajador con la que el usuario queda cubierto por las asignaciones.
 */
export async function findParaAcceso(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.trabajador_id, u.estado, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ? LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}
