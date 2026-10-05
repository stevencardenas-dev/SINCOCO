import { pool } from '../db/pool.js'
import { Cliente } from '../entities/Cliente.js'

/**
 * Repositorio de la tabla `clientes` (HU-02).
 */

const CAMPOS = `id, numero_documento, tipo_documento, razon_social_nombre,
                nombre_contacto, telefono, email, direccion, estado, activo`

const CAMPOS_C = CAMPOS.split(',').map((c) => `c.${c.trim()}`).join(', ')

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
  return listar(false)
}

/**
 * Catálogo de clientes. `incluirInactivos` lo usa Gestión Administrativa, que
 * administra también los clientes dados de baja (HU-18).
 */
export async function listar(incluirInactivos = false) {
  // `proyectos_activos`: proyectos vigentes del cliente (no dados de baja ni
  // finalizados/cancelados). Gestión Administrativa lo muestra al darlo de baja.
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_C},
            (SELECT COUNT(*) FROM proyectos p
              WHERE p.cliente_id = c.id AND p.activo = 1
                AND p.estado NOT IN ('FINALIZADO', 'CANCELADO')) AS proyectos_activos
       FROM clientes c
     ${incluirInactivos ? '' : 'WHERE c.activo = 1'}
     ORDER BY c.razon_social_nombre`,
  )
  return rows.map(Cliente.fromRow)
}

/** Actualización parcial: solo se escriben los campos recibidos. */
export async function update(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
  await pool.query(
    `UPDATE clientes SET ${asignaciones.join(', ')} WHERE id = ?`,
    [...Object.values(campos), id],
  )
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
