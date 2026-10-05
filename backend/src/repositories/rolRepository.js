import { pool } from '../db/pool.js'

/**
 * Repositorio de `roles` y de su matriz de permisos (`roles_permisos`).
 * No hay baja lógica de roles: la tabla no tiene columna `activo` y los
 * permisos asociados se van con el rol por la FK CASCADE.
 */

export async function listar() {
  const [rows] = await pool.query('SELECT id, nombre, descripcion FROM roles ORDER BY id')
  return rows
}

export async function listarConConteos() {
  const [rows] = await pool.query(
    `SELECT r.id, r.nombre, r.descripcion,
            COUNT(DISTINCT rp.permiso_id) AS permisos_activos,
            (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id) AS usuarios,
            (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id AND u.activo = 1) AS usuarios_activos
       FROM roles r
       LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
      GROUP BY r.id, r.nombre, r.descripcion
      ORDER BY r.id`,
  )
  return rows
}

export async function findById(id) {
  const [[fila]] = await pool.query('SELECT id, nombre, descripcion FROM roles WHERE id = ?', [id])
  return fila || null
}

export async function findPorNombre(nombre) {
  const [[fila]] = await pool.query('SELECT id, nombre FROM roles WHERE nombre = ? LIMIT 1', [nombre])
  return fila || null
}

export async function create({ nombre, descripcion }) {
  const [result] = await pool.query('INSERT INTO roles (nombre, descripcion) VALUES (?, ?)', [
    nombre,
    descripcion,
  ])
  return result.insertId
}

export async function update(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
  await pool.query(`UPDATE roles SET ${asignaciones.join(', ')} WHERE id = ?`, [
    ...Object.values(campos),
    id,
  ])
}

export async function remove(id) {
  await pool.query('DELETE FROM roles WHERE id = ?', [id])
}

export async function contarUsuarios(id) {
  const [[{ usuarios }]] = await pool.query(
    'SELECT COUNT(*) AS usuarios FROM usuarios WHERE rol_id = ?',
    [id],
  )
  return Number(usuarios)
}

/** Catálogo completo de permisos (también los que ningún rol tiene). */
export async function listarPermisos() {
  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion, modulo FROM permisos ORDER BY modulo, nombre',
  )
  return rows
}

/** Contenido real de roles_permisos (no se deduce: se lee de la base). */
export async function listarAsignaciones() {
  const [rows] = await pool.query(
    `SELECT rp.rol_id, rp.permiso_id
       FROM roles_permisos rp
       JOIN roles r ON r.id = rp.rol_id
       JOIN permisos p ON p.id = rp.permiso_id
      ORDER BY rp.rol_id, p.modulo, p.nombre`,
  )
  return rows
}

export async function findPermisoPorNombre(nombre) {
  const [[fila]] = await pool.query('SELECT id FROM permisos WHERE nombre = ? LIMIT 1', [nombre])
  return fila || null
}

/** Cuántos de los ids indicados existen como permiso. */
export async function contarPermisosExistentes(ids) {
  if (ids.length === 0) return 0
  const [filas] = await pool.query(
    `SELECT id FROM permisos WHERE id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  )
  return filas.length
}

/** Nombres de los permisos que concede un rol (por nombre de rol). */
export async function nombresPermisosDeRol(nombreRol) {
  const [rows] = await pool.query(
    `SELECT p.nombre
       FROM permisos p
       JOIN roles_permisos rp ON rp.permiso_id = p.id
       JOIN roles r ON r.id = rp.rol_id
      WHERE r.nombre = ?
      ORDER BY p.nombre`,
    [nombreRol],
  )
  return rows.map((r) => r.nombre)
}

/** Deja `roles_permisos` del rol exactamente con `permisoIds`, en una transacción. */
export async function reemplazarPermisos(rolId, permisoIds) {
  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    await conexion.query('DELETE FROM roles_permisos WHERE rol_id = ?', [rolId])
    if (permisoIds.length > 0) {
      await conexion.query(
        `INSERT INTO roles_permisos (rol_id, permiso_id) VALUES ${permisoIds.map(() => '(?, ?)').join(', ')}`,
        permisoIds.flatMap((permisoId) => [rolId, permisoId]),
      )
    }
    await conexion.commit()
  } catch (error) {
    await conexion.rollback()
    throw error
  } finally {
    conexion.release()
  }
}
