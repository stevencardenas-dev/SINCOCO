import { pool } from '../db/pool.js'

/**
 * Recuperación de contraseña (HU-01): solicitudes y códigos de un solo uso
 * sobre la tabla `restablecimientos_password`.
 *
 * El código se guarda legible porque el canal de entrega es el administrador
 * (el sistema no envía correo): él lo ve en el módulo de Usuarios y se lo pasa
 * al usuario. Por eso mismo no se copia a la bitácora y se inutiliza al usarse,
 * al vencer o al generar uno nuevo.
 */

/** El usuario escribe su nombre de usuario o su correo empresarial. */
export async function findUsuarioPorIdentificador(identificador) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.estado, u.activo
       FROM usuarios u
      WHERE u.username = ? OR u.email = ?
      LIMIT 1`,
    [identificador, identificador],
  )
  return rows[0] ?? null
}

/** Invalida los códigos anteriores: solo el último solicitado sirve. */
export async function anularPendientes(usuarioId) {
  await pool.query(
    `UPDATE restablecimientos_password
        SET usado_en = NOW()
      WHERE usuario_id = ? AND usado_en IS NULL`,
    [usuarioId],
  )
}

export async function crearSolicitud({ usuarioId, codigo, minutos, ip }) {
  const [result] = await pool.query(
    `INSERT INTO restablecimientos_password (usuario_id, codigo, expira_en, direccion_ip)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)`,
    [usuarioId, codigo, minutos, ip ?? null],
  )
  return result.insertId
}

/** Código vigente: el último que no se ha usado y aún no vence. */
export async function findSolicitudVigente(usuarioId) {
  const [rows] = await pool.query(
    `SELECT id, usuario_id, codigo, expira_en, intentos,
            (expira_en < NOW()) AS vencido
       FROM restablecimientos_password
      WHERE usuario_id = ? AND usado_en IS NULL
      ORDER BY id DESC
      LIMIT 1`,
    [usuarioId],
  )
  return rows[0] ?? null
}

export async function sumarIntento(id) {
  await pool.query('UPDATE restablecimientos_password SET intentos = intentos + 1 WHERE id = ?', [id])
}

export async function marcarUsado(id) {
  await pool.query('UPDATE restablecimientos_password SET usado_en = NOW() WHERE id = ?', [id])
}

export async function actualizarPassword(usuarioId, passwordHash) {
  // Al recuperar la contraseña se cierra la sesión vigente: si el cambio viene
  // de alguien que perdió el control de la cuenta, el intruso no conserva el
  // token que ya tenía.
  await pool.query(
    'UPDATE usuarios SET password_hash = ?, sesion_actual = NULL WHERE id = ?',
    [passwordHash, usuarioId],
  )
}

/** Solicitudes pendientes de entregar, para el módulo de Usuarios. */
export async function listarSolicitudesVigentes() {
  const [rows] = await pool.query(
    `SELECT r.id, r.codigo, r.expira_en, r.solicitado_en, r.direccion_ip,
            u.id AS usuario_id, u.username, u.email,
            TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS trabajador,
            TIMESTAMPDIFF(MINUTE, NOW(), r.expira_en) AS minutos_restantes
       FROM restablecimientos_password r
       JOIN usuarios u ON u.id = r.usuario_id
       LEFT JOIN trabajadores t ON t.id = u.trabajador_id
      WHERE r.usado_en IS NULL AND r.expira_en >= NOW()
      ORDER BY r.id DESC`,
  )
  return rows
}
