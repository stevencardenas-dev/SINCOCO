import { pool } from '../db/pool.js'
import { Usuario } from '../entities/Usuario.js'
import { ACTIVIDAD_SQL } from '../db/sesion.js'

/**
 * Repositorio de la tabla `usuarios` (HU-01 · HU-02).
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

/** Credenciales y estado de una cuenta, por nombre de usuario (login). */
export async function findParaLogin(username) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.estado, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE u.username = ?`,
    [username],
  )
  return rows[0] ?? null
}

/**
 * Abre la sesión única de la cuenta. La condición va dentro del UPDATE para que
 * dos ingresos simultáneos no puedan pasar los dos: solo se abre si la cuenta no
 * tiene sesión o la que tenía lleva `minutosInactividad` sin actividad.
 * Devuelve las filas afectadas (0 = la cuenta ya tiene una sesión activa).
 */
export async function abrirSesion(id, sesion, minutosInactividad) {
  const [resultado] = await pool.query(
    `UPDATE usuarios
        SET ultimo_acceso = NOW(), sesion_actual = ?, sesion_iniciada_en = NOW(), sesion_actividad = NOW()
      WHERE id = ?
        AND (sesion_actual IS NULL
             OR ${ACTIVIDAD_SQL} IS NULL
             OR ${ACTIVIDAD_SQL} < NOW() - INTERVAL ? MINUTE)`,
    [sesion, id, minutosInactividad],
  )
  return resultado.affectedRows
}

/** Deja la cuenta sin sesión activa (solo si `sesion` sigue siendo la vigente). */
export async function cerrarSesion(id, sesion) {
  await pool.query('UPDATE usuarios SET sesion_actual = NULL WHERE id = ? AND sesion_actual = ?', [
    id,
    sesion,
  ])
}

export async function create({ trabajador_id, username, password_hash, email, rol_id }) {
  const [result] = await pool.query(
    'INSERT INTO usuarios (trabajador_id, username, password_hash, email, rol_id) VALUES (?, ?, ?, ?, ?)',
    [trabajador_id, username, password_hash, email, rol_id],
  )
  return result.insertId
}

export async function findParaEditar(id) {
  const [filas] = await pool.query(
    'SELECT id, username, email, activo FROM usuarios WHERE id = ?',
    [id],
  )
  return filas[0] ?? null
}

export async function updateDatos(id, { username, email }) {
  await pool.query('UPDATE usuarios SET username = ?, email = ? WHERE id = ?', [username, email, id])
}

/** HU-18: por defecto solo los activos; `incluirInactivos` trae los archivados. */
export async function listar({ incluirInactivos = false } = {}) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.estado, u.rol_id, u.activo, r.nombre AS rol,
            TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS trabajador,
            t.tipo_documento AS trab_tipo_documento, t.numero_documento AS trab_numero_documento,
            t.email AS trab_email, t.telefono AS trab_telefono, t.direccion AS trab_direccion,
            t.estado AS trab_estado, t.activo AS trab_activo,
            c.nombre AS trab_cargo, e.nombre AS trab_especialidad
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN trabajadores t ON t.id = u.trabajador_id
     LEFT JOIN cargos c ON c.id = t.cargo_id
     LEFT JOIN especialidades e ON e.id = t.especialidad_id
     ${incluirInactivos ? '' : 'WHERE u.activo = 1'}
     ORDER BY u.id`,
  )
  return rows
}

/** Trabajadores activos sin cuenta: usuarios.trabajador_id es UNIQUE. */
export async function listarTrabajadoresSinCuenta() {
  const [rows] = await pool.query(
    `SELECT t.id, t.nombres, t.apellidos, t.numero_documento, c.nombre AS cargo
     FROM trabajadores t
     JOIN cargos c ON c.id = t.cargo_id
     LEFT JOIN usuarios u ON u.trabajador_id = t.id
     WHERE u.id IS NULL AND t.activo = 1
     ORDER BY t.nombres, t.apellidos`,
  )
  return rows
}

export async function findRolActual(id) {
  const [[fila]] = await pool.query(
    `SELECT u.rol_id, r.nombre AS rol FROM usuarios u
     JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`,
    [id],
  )
  return fila ?? null
}

export async function updateRol(id, rolId) {
  await pool.query('UPDATE usuarios SET rol_id = ? WHERE id = ?', [rolId, id])
}

export async function findEstado(id) {
  const [[fila]] = await pool.query('SELECT estado FROM usuarios WHERE id = ?', [id])
  return fila ?? null
}

export async function updateEstado(id, estado) {
  await pool.query('UPDATE usuarios SET estado = ? WHERE id = ?', [estado, id])
}
