import { pool } from '../db/pool.js'
import { Material } from '../entities/Material.js'

/** Repositorio de la tabla `materiales` (HU-07). */

const CAMPOS = `m.id, m.codigo, m.categoria_id, c.nombre AS categoria, m.descripcion,
                m.unidad_medida, m.existencia_total, m.costo_referencia, m.nivel_minimo,
                m.estado, m.activo, m.fecha_baja`

const DESDE = `FROM materiales m JOIN categorias_materiales c ON c.id = m.categoria_id`

export async function findById(id) {
  const [rows] = await pool.query(`SELECT ${CAMPOS} ${DESDE} WHERE m.id = ? LIMIT 1`, [id])
  return Material.fromRow(rows[0])
}

/** Unicidad de `codigo` (UNIQUE KEY del esquema), incluidos los dados de baja. */
export async function findByCodigo(codigo) {
  const [rows] = await pool.query('SELECT id, activo FROM materiales WHERE codigo = ? LIMIT 1', [codigo])
  return rows[0] || null
}

/** Lista el catálogo. Por defecto solo activos (HU-18). */
export async function listar({
  incluirInactivos = false,
  buscar = '',
  categoriaId = null,
  bajoMinimo = false,
} = {}) {
  const condiciones = []
  const params = []

  if (!incluirInactivos) condiciones.push('m.activo = 1')

  const texto = String(buscar ?? '').trim()
  if (texto) {
    condiciones.push('(m.codigo LIKE ? OR m.descripcion LIKE ?)')
    const patron = `%${texto}%`
    params.push(patron, patron)
  }
  if (categoriaId) {
    condiciones.push('m.categoria_id = ?')
    params.push(categoriaId)
  }
  if (bajoMinimo) {
    condiciones.push('m.activo = 1 AND m.nivel_minimo > 0 AND m.existencia_total <= m.nivel_minimo')
  }

  const [rows] = await pool.query(
    `SELECT ${CAMPOS} ${DESDE}
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY c.nombre, m.descripcion, m.codigo`,
    params,
  )
  return rows.map(Material.fromRow)
}

/** `existencia_total` queda en su DEFAULT 0: solo la mueven los procesos de inventario. */
export async function create(dto) {
  const [result] = await pool.query(
    `INSERT INTO materiales
       (codigo, categoria_id, descripcion, unidad_medida, costo_referencia, nivel_minimo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [dto.codigo, dto.categoria_id, dto.descripcion, dto.unidad_medida,
     dto.costo_referencia, dto.nivel_minimo],
  )
  return result.insertId
}

// Lista blanca: los nombres de columna no se pueden parametrizar y
// `existencia_total` queda fuera a propósito (HU-07 · criterio 4).
const EDITABLES = new Set([
  'codigo', 'categoria_id', 'descripcion', 'unidad_medida', 'costo_referencia', 'nivel_minimo',
])

export async function update(id, campos) {
  const claves = Object.keys(campos).filter((k) => EDITABLES.has(k))
  if (claves.length === 0) return 0
  const [result] = await pool.query(
    `UPDATE materiales SET ${claves.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    [...claves.map((k) => campos[k]), id],
  )
  return result.affectedRows
}

/** HU-18: baja lógica; el material deja de ofrecerse pero conserva su historial. */
export async function darDeBaja(id, usuarioId) {
  const [result] = await pool.query(
    `UPDATE materiales
        SET activo = 0, estado = 'INACTIVO', fecha_baja = NOW(), baja_por_usuario_id = ?
      WHERE id = ? AND activo = 1`,
    [usuarioId ?? null, id],
  )
  return result.affectedRows
}

export async function reactivar(id) {
  const [result] = await pool.query(
    `UPDATE materiales
        SET activo = 1, estado = 'ACTIVO', fecha_baja = NULL, baja_por_usuario_id = NULL
      WHERE id = ? AND activo = 0`,
    [id],
  )
  return result.affectedRows
}

/** Categorías del catálogo, para el selector del formulario. */
export async function listarCategorias() {
  const [rows] = await pool.query('SELECT id, nombre, descripcion FROM categorias_materiales ORDER BY nombre')
  return rows
}

export async function findCategoria(id) {
  const [rows] = await pool.query(
    'SELECT id, nombre FROM categorias_materiales WHERE id = ? LIMIT 1',
    [id],
  )
  return rows[0] || null
}
