import { pool } from '../db/pool.js'
import { Trabajador } from '../entities/Trabajador.js'

/**
 * Repositorio de la tabla `trabajadores` (HU-04, HU-02).
 */

const CAMPOS = `id, numero_documento, tipo_documento, nombres, apellidos,
                email, telefono, direccion, cargo, especialidad,
                disponible, estado, activo`

export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM trabajadores WHERE id = ? LIMIT 1`,
    [id],
  )
  return Trabajador.fromRow(rows[0])
}

/** Unicidad de `numero_documento` (UNIQUE KEY del esquema). */
export async function findByDocumento(numeroDocumento) {
  const [rows] = await pool.query(
    'SELECT id FROM trabajadores WHERE numero_documento = ? LIMIT 1',
    [numeroDocumento],
  )
  return rows[0] || null
}

/** Unicidad de `email` (UNIQUE KEY del esquema). */
export async function findByEmail(email) {
  if (!email) return null
  const [rows] = await pool.query(
    'SELECT id FROM trabajadores WHERE email = ? LIMIT 1',
    [email],
  )
  return rows[0] || null
}

/**
 * Lista el catálogo de personal. Por defecto solo activos (HU-18: los
 * registros dados de baja no aparecen salvo petición explícita).
 */
export async function listar(incluirInactivos = false) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM trabajadores
     ${incluirInactivos ? '' : 'WHERE activo = 1'}
     ORDER BY apellidos, nombres`,
  )
  return rows.map(Trabajador.fromRow)
}

export async function create(t) {
  const [result] = await pool.query(
    `INSERT INTO trabajadores
       (numero_documento, tipo_documento, nombres, apellidos, email, telefono,
        direccion, cargo, especialidad, disponible, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.numero_documento, t.tipo_documento, t.nombres, t.apellidos,
      t.email, t.telefono, t.direccion, t.cargo, t.especialidad,
      t.disponible, t.estado,
    ],
  )
  return result.insertId
}

export async function update(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
  const params = [...Object.values(campos), id]
  await pool.query(
    `UPDATE trabajadores SET ${asignaciones.join(', ')} WHERE id = ?`,
    params,
  )
}
