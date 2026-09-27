import { pool } from '../db/pool.js'
import { Cliente } from '../entities/Cliente.js'

/**
 * Repositorio de la tabla `clientes` (HU-02).
 */

const CAMPOS = `id, numero_documento, tipo_documento, razon_social_nombre,
                nombre_contacto, telefono, email, direccion, estado, activo`

export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM clientes WHERE id = ? LIMIT 1`,
    [id],
  )
  return Cliente.fromRow(rows[0])
}

/**
 * Valida unicidad de `numero_documento` (UNIQUE KEY del esquema) antes de
 * insertar, para devolver un 409 con el campo en conflicto.
 */
export async function findByDocumento(numeroDocumento) {
  const [rows] = await pool.query(
    'SELECT id FROM clientes WHERE numero_documento = ? LIMIT 1',
    [numeroDocumento],
  )
  return rows[0] || null
}

/**
 * Lista el catálogo de clientes activos para el formulario de CU-02.
 */
export async function listarActivos() {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM clientes WHERE activo = 1
     ORDER BY razon_social_nombre`,
  )
  return rows.map(Cliente.fromRow)
}

export async function create(cliente) {
  const [result] = await pool.query(
    `INSERT INTO clientes
       (numero_documento, tipo_documento, razon_social_nombre,
        nombre_contacto, telefono, email, direccion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cliente.numero_documento,
      cliente.tipo_documento,
      cliente.razon_social_nombre,
      cliente.nombre_contacto,
      cliente.telefono,
      cliente.email,
      cliente.direccion,
    ],
  )
  return result.insertId
}
