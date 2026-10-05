import { pool } from '../db/pool.js'

/**
 * Repositorio de los catálogos del personal: `cargos` y `especialidades`
 * (HU-04). Son tablas de dominio: `trabajadores` apunta a ellas por clave
 * foránea, así que el cargo y la especialidad dejan de escribirse a mano.
 *
 * `en_uso` cuenta los trabajadores (activos o no) que referencian la fila; el
 * administrador necesita ese dato antes de dar de baja un valor del catálogo.
 */

const CAMPOS_CARGO = `c.id, c.nombre, c.descripcion, c.categoria, c.operativo, c.estado, c.activo,
                      (SELECT COUNT(*) FROM trabajadores t WHERE t.cargo_id = c.id) AS en_uso`

const CAMPOS_ESPECIALIDAD = `e.id, e.nombre, e.descripcion, e.categoria, e.estado, e.activo,
                             (SELECT COUNT(*) FROM trabajadores t WHERE t.especialidad_id = e.id) AS en_uso`

// Los cargos operativos van primero: son los que exigen especialidad.
const ORDEN_CARGO = 'ORDER BY c.activo DESC, c.operativo DESC, c.nombre'
const ORDEN_ESPECIALIDAD = 'ORDER BY e.activo DESC, e.nombre'

/** Catálogo de cargos. Por defecto solo los vigentes (activo = 1). */
export async function listarCargos(incluirInactivos = false) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_CARGO} FROM cargos c ${incluirInactivos ? '' : 'WHERE c.activo = 1'} ${ORDEN_CARGO}`,
  )
  return rows
}

/** Catálogo de especialidades. */
export async function listarEspecialidades(incluirInactivos = false) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_ESPECIALIDAD} FROM especialidades e ${incluirInactivos ? '' : 'WHERE e.activo = 1'} ${ORDEN_ESPECIALIDAD}`,
  )
  return rows
}

export async function findCargoById(id) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_CARGO} FROM cargos c WHERE c.id = ? LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

/**
 * Busca por nombre. La colación de la base (utf8mb4_unicode_ci) no distingue
 * mayúsculas ni tildes, así que 'mamposteria' encuentra 'Mampostería'.
 */
export async function findCargoPorNombre(nombre) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_CARGO} FROM cargos c WHERE c.nombre = ? LIMIT 1`,
    [String(nombre).trim()],
  )
  return rows[0] ?? null
}

export async function findEspecialidadById(id) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_ESPECIALIDAD} FROM especialidades e WHERE e.id = ? LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

export async function findEspecialidadPorNombre(nombre) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_ESPECIALIDAD} FROM especialidades e WHERE e.nombre = ? LIMIT 1`,
    [String(nombre).trim()],
  )
  return rows[0] ?? null
}

export async function crearCargo({ nombre, descripcion, categoria, operativo }) {
  const [result] = await pool.query(
    'INSERT INTO cargos (nombre, descripcion, categoria, operativo) VALUES (?, ?, ?, ?)',
    [nombre, descripcion ?? null, categoria ?? null, operativo ? 1 : 0],
  )
  return result.insertId
}

export async function crearEspecialidad({ nombre, descripcion, categoria }) {
  const [result] = await pool.query(
    'INSERT INTO especialidades (nombre, descripcion, categoria) VALUES (?, ?, ?)',
    [nombre, descripcion ?? null, categoria ?? null],
  )
  return result.insertId
}

/** Actualización parcial: solo se escriben los campos recibidos. */
export async function actualizarCargo(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `c.${c} = ?`)
  await pool.query(
    `UPDATE cargos c SET ${asignaciones.join(', ')} WHERE c.id = ?`,
    [...Object.values(campos), id],
  )
}

export async function actualizarEspecialidad(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `e.${c} = ?`)
  await pool.query(
    `UPDATE especialidades e SET ${asignaciones.join(', ')} WHERE e.id = ?`,
    [...Object.values(campos), id],
  )
}
