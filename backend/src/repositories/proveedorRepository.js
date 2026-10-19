import { pool } from '../db/pool.js'
import { Proveedor } from '../entities/Proveedor.js'

/**
 * Repositorio de la tabla `proveedores` (HU-13).
 */

const CAMPOS = `id, documento_identificacion, razon_social, nombre_contacto,
                telefono, email, direccion, estado, activo, fecha_baja,
                (SELECT COUNT(*) FROM proveedor_documentos d WHERE d.proveedor_id = proveedores.id) AS documentos`

export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM proveedores WHERE id = ? LIMIT 1`,
    [id],
  )
  return Proveedor.fromRow(rows[0])
}

/**
 * Valida unicidad de `documento_identificacion` (UNIQUE KEY del esquema) antes
 * de insertar, para devolver un 409 con el campo en conflicto. `excluirId`
 * permite reutilizarla al editar.
 */
export async function findByDocumento(documento, excluirId = null) {
  const [rows] = await pool.query(
    'SELECT id FROM proveedores WHERE documento_identificacion = ? AND id <> ? LIMIT 1',
    [documento, excluirId ?? 0],
  )
  return rows[0] || null
}

/** Catálogo de proveedores; por defecto solo los que no están dados de baja. */
export async function listar(incluirInactivos = false, buscar = '') {
  const condiciones = []
  const params = []
  if (!incluirInactivos) condiciones.push('activo = 1')
  if (buscar) {
    condiciones.push('(documento_identificacion LIKE ? OR razon_social LIKE ? OR nombre_contacto LIKE ?)')
    params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`)
  }
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM proveedores
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY razon_social`,
    params,
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

export async function update(id, proveedor) {
  await pool.query(
    `UPDATE proveedores
        SET documento_identificacion = ?, razon_social = ?, nombre_contacto = ?,
            telefono = ?, email = ?, direccion = ?
      WHERE id = ?`,
    [
      proveedor.documento_identificacion,
      proveedor.razon_social,
      proveedor.nombre_contacto,
      proveedor.telefono,
      proveedor.email,
      proveedor.direccion,
      id,
    ],
  )
}

/** HU-13 criterio 4: baja lógica; el proveedor queda INACTIVO. */
export async function darDeBaja(id, usuarioId) {
  const [result] = await pool.query(
    `UPDATE proveedores
        SET activo = 0, estado = 'INACTIVO', fecha_baja = NOW(), baja_por_usuario_id = ?
      WHERE id = ? AND activo = 1`,
    [usuarioId ?? null, id],
  )
  return result.affectedRows
}

export async function reactivar(id) {
  const [result] = await pool.query(
    `UPDATE proveedores
        SET activo = 1, estado = 'ACTIVO', fecha_baja = NULL, baja_por_usuario_id = NULL
      WHERE id = ? AND activo = 0`,
    [id],
  )
  return result.affectedRows
}

// --- Documentos de soporte (HU-13 criterio 3) ---

const CAMPOS_DOC = 'id, proveedor_id, tipo, nombre_archivo, tipo_mime, tamano, creado_en'

export async function listarDocumentos(proveedorId) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_DOC} FROM proveedor_documentos WHERE proveedor_id = ? ORDER BY creado_en DESC, id DESC`,
    [proveedorId],
  )
  return rows
}

export async function findDocumento(proveedorId, documentoId, conContenido = false) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_DOC}${conContenido ? ', contenido' : ''}
       FROM proveedor_documentos WHERE id = ? AND proveedor_id = ? LIMIT 1`,
    [documentoId, proveedorId],
  )
  return rows[0] || null
}

export async function crearDocumento(doc) {
  const [result] = await pool.query(
    `INSERT INTO proveedor_documentos
       (proveedor_id, tipo, nombre_archivo, tipo_mime, tamano, contenido, subido_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [doc.proveedorId, doc.tipo, doc.nombre, doc.mime, doc.contenido.length, doc.contenido, doc.usuarioId ?? null],
  )
  return result.insertId
}

export async function eliminarDocumento(proveedorId, documentoId) {
  const [result] = await pool.query(
    'DELETE FROM proveedor_documentos WHERE id = ? AND proveedor_id = ?',
    [documentoId, proveedorId],
  )
  return result.affectedRows
}
