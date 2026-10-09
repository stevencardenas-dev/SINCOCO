import { pool } from '../db/pool.js'
import { Proveedor } from '../entities/Proveedor.js'

/**
 * Repositorio de la tabla `proveedores` (HU-13).
 */

const CAMPOS = `id, documento_identificacion, razon_social, nombre_contacto,
                telefono, email, direccion, estado, activo`

export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM proveedores WHERE id = ? LIMIT 1`,
    [id],
  )
  return Proveedor.fromRow(rows[0])
}

/**
 * Valida unicidad de `documento_identificacion` (UNIQUE KEY del esquema) antes
 * de insertar, para devolver un 409 con el campo en conflicto.
 */
export async function findByDocumento(documento) {
  const [rows] = await pool.query(
    'SELECT id FROM proveedores WHERE documento_identificacion = ? LIMIT 1',
    [documento],
  )
  return rows[0] || null
}

/** Catálogo de proveedores; por defecto solo los que no están dados de baja. */
export async function listar(incluirInactivos = false) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM proveedores
     ${incluirInactivos ? '' : 'WHERE activo = 1'}
     ORDER BY razon_social`,
  )
  return rows.map(Proveedor.fromRow)
}

export async function create(proveedor) {
  const [result] = await pool.query(
    `INSERT INTO proveedores
       (documento_identificacion, razon_social, nombre_contacto,
        telefono, email, direccion)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      proveedor.documento_identificacion,
      proveedor.razon_social,
      proveedor.nombre_contacto,
      proveedor.telefono,
      proveedor.email,
      proveedor.direccion,
    ],
  )
  return result.insertId
}
