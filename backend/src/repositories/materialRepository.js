import { pool } from '../db/pool.js'
import { Material } from '../entities/Material.js'
import { EXISTENCIA_ALMACEN_SQL } from './existenciaAlmacenRepository.js'

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
  almacenId = null,
} = {}) {
  const condiciones = []
  // Con almacén: solo lo que tiene saldo allí, con esa cantidad en `existencia_almacen`.
  // El `?` del JOIN va antes que los del WHERE.
  const porAlmacen = Boolean(almacenId)
  const params = porAlmacen ? [almacenId] : []
  if (porAlmacen) condiciones.push(`${EXISTENCIA_ALMACEN_SQL} > 0`)

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
    `SELECT ${CAMPOS}${porAlmacen ? `, ${EXISTENCIA_ALMACEN_SQL} AS existencia_almacen` : ''} ${DESDE}
     ${porAlmacen ? 'JOIN almacenes a ON a.id = ?' : ''}
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY c.nombre, m.descripcion, m.codigo`,
    params,
  )
  return rows.map(Material.fromRow)
}

/** Saldo de un material en cada almacén activo que lo tiene (mayor primero). */
export async function existenciasPorAlmacen(materialId) {
  const [rows] = await pool.query(
    `SELECT a.id AS almacen_id, a.codigo, a.nombre AS almacen, a.es_central,
            ${EXISTENCIA_ALMACEN_SQL} AS cantidad
       FROM almacenes a JOIN materiales m ON m.id = ?
      WHERE a.activo = 1
     HAVING cantidad > 0
      ORDER BY cantidad DESC, a.nombre`,
    [materialId],
  )
  return rows.map((r) => ({ ...r, cantidad: Number(r.cantidad) }))
}
