import { pool } from '../db/pool.js'

/**
 * Datos del propio usuario (HU-01 · HU-04): su cuenta de acceso y, si la tiene,
 * su ficha de trabajador con el cargo y la especialidad del catálogo.
 *
 * `usuarios.email` es el correo empresarial y no se edita desde aquí; el
 * correo de contacto vive en `trabajadores.email`.
 */
export async function findPerfil(usuarioId) {
  const [rows] = await pool.query(
    `SELECT u.id AS usuario_id, u.username, u.email AS email_empresarial, u.estado,
            u.ultimo_acceso, u.creado_en, r.nombre AS rol,
            t.id AS trabajador_id, t.numero_documento, t.tipo_documento,
            t.nombres, t.apellidos, t.email AS email_contacto,
            t.telefono, t.direccion, t.estado AS estado_trabajador,
            c.nombre AS cargo, e.nombre AS especialidad
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
       LEFT JOIN cargos c ON c.id = t.cargo_id
       LEFT JOIN especialidades e ON e.id = t.especialidad_id
      WHERE u.id = ?
      LIMIT 1`,
    [usuarioId],
  )
  return rows[0] ?? null
}

export async function findPasswordHash(usuarioId) {
  const [rows] = await pool.query(
    'SELECT password_hash FROM usuarios WHERE id = ? LIMIT 1',
    [usuarioId],
  )
  return rows[0]?.password_hash ?? null
}

/** `trabajadores.numero_documento` es UNIQUE: se comprueba antes de escribir. */
export async function documentoEnUso(numeroDocumento, exceptoTrabajadorId) {
  const [rows] = await pool.query(
    'SELECT id FROM trabajadores WHERE numero_documento = ? AND id <> ? LIMIT 1',
    [numeroDocumento, exceptoTrabajadorId],
  )
  return rows[0] ?? null
}

/** `trabajadores.email` es UNIQUE: se comprueba antes de escribir. */
export async function emailEnUso(email, exceptoTrabajadorId) {
  if (!email) return null
  const [rows] = await pool.query(
    'SELECT id FROM trabajadores WHERE email = ? AND id <> ? LIMIT 1',
    [email, exceptoTrabajadorId],
  )
  return rows[0] ?? null
}

export async function actualizarTrabajador(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
  await pool.query(
    `UPDATE trabajadores SET ${asignaciones.join(', ')} WHERE id = ?`,
    [...Object.values(campos), id],
  )
}

export async function cambiarPassword(usuarioId, passwordHash) {
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, usuarioId])
}
