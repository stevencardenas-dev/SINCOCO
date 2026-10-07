import { pool } from '../db/pool.js'
import { Herramienta } from '../entities/Herramienta.js'

/** Repositorio de la tabla `herramientas` (HU-10). */

const CAMPOS = `h.id, h.codigo_serial, h.nombre, h.marca, h.modelo, h.almacen_id,
                a.nombre AS almacen, a.codigo AS almacen_codigo,
                h.estado_operativo, h.disponibilidad, h.observaciones,
                h.activo, h.fecha_baja`

const DESDE = `FROM herramientas h JOIN almacenes a ON a.id = h.almacen_id`

export async function findById(id) {
  const [rows] = await pool.query(`SELECT ${CAMPOS} ${DESDE} WHERE h.id = ? LIMIT 1`, [id])
  return Herramienta.fromRow(rows[0])
}

/** Unicidad de `codigo_serial` (UNIQUE KEY del esquema). */
export async function findBySerial(codigoSerial) {
  const [rows] = await pool.query(
    'SELECT id FROM herramientas WHERE codigo_serial = ? LIMIT 1',
    [codigoSerial],
  )
  return rows[0] || null
}

/**
 * Lista el catálogo. Por defecto solo activas (HU-18). `prestable` filtra las
 * que hoy pueden salir a préstamo (HU-10 · criterios 3 y 4).
 */
export async function listar({
  incluirInactivos = false,
  buscar = '',
  almacenId = null,
  estadoOperativo = '',
  disponibilidad = '',
  prestable = false,
} = {}) {
  const condiciones = []
  const params = []

  if (!incluirInactivos) condiciones.push('h.activo = 1')

  const texto = String(buscar ?? '').trim()
  if (texto) {
    condiciones.push(
      '(h.codigo_serial LIKE ? OR h.nombre LIKE ? OR h.marca LIKE ? OR h.modelo LIKE ?)',
    )
    const patron = `%${texto}%`
    params.push(patron, patron, patron, patron)
  }
  if (almacenId) {
    condiciones.push('h.almacen_id = ?')
    params.push(almacenId)
  }
  if (estadoOperativo) {
    condiciones.push('h.estado_operativo = ?')
    params.push(estadoOperativo)
  }
  if (disponibilidad) {
    condiciones.push('h.disponibilidad = ?')
    params.push(disponibilidad)
  }
  if (prestable) {
    condiciones.push(
      `h.activo = 1 AND h.disponibilidad = 'DISPONIBLE'
       AND h.estado_operativo IN ('EXCELENTE', 'BUENO', 'REGULAR')`,
    )
  }

  const [rows] = await pool.query(
    `SELECT ${CAMPOS} ${DESDE}
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY h.nombre, h.codigo_serial`,
    params,
  )
  return rows.map(Herramienta.fromRow)
}

export async function create(dto) {
  const [result] = await pool.query(
    `INSERT INTO herramientas
       (codigo_serial, nombre, marca, modelo, almacen_id, estado_operativo, disponibilidad, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [dto.codigo_serial, dto.nombre, dto.marca, dto.modelo, dto.almacen_id,
     dto.estado_operativo, dto.disponibilidad, dto.observaciones],
  )
  return result.insertId
}

// Lista blanca: los nombres de columna no se pueden parametrizar.
const EDITABLES = new Set([
  'codigo_serial', 'nombre', 'marca', 'modelo', 'almacen_id', 'estado_operativo', 'observaciones',
])

export async function update(id, campos) {
  const claves = Object.keys(campos).filter((k) => EDITABLES.has(k))
  if (claves.length === 0) return 0
  const [result] = await pool.query(
    `UPDATE herramientas SET ${claves.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    [...claves.map((k) => campos[k]), id],
  )
  return result.affectedRows
}

/** HU-18 · HU-10 criterio 4: baja lógica; la herramienta queda en disponibilidad BAJA. */
export async function darDeBaja(id, usuarioId) {
  const [result] = await pool.query(
    `UPDATE herramientas
        SET activo = 0, fecha_baja = NOW(), baja_por_usuario_id = ?, disponibilidad = 'BAJA'
      WHERE id = ? AND activo = 1`,
    [usuarioId ?? null, id],
  )
  return result.affectedRows
}

/** Reactiva una herramienta dada de baja: vuelve DISPONIBLE. */
export async function reactivar(id) {
  const [result] = await pool.query(
    `UPDATE herramientas
        SET activo = 1, fecha_baja = NULL, baja_por_usuario_id = NULL, disponibilidad = 'DISPONIBLE'
      WHERE id = ? AND activo = 0`,
    [id],
  )
  return result.affectedRows
}

/** Almacenes activos, para el selector del formulario (solo lectura). */
export async function listarAlmacenes() {
  const [rows] = await pool.query(
    `SELECT id, codigo, nombre, ubicacion, es_central
       FROM almacenes WHERE activo = 1 ORDER BY es_central DESC, nombre`,
  )
  return rows
}

export async function findAlmacen(id) {
  const [rows] = await pool.query(
    'SELECT id, codigo, nombre, activo FROM almacenes WHERE id = ? LIMIT 1',
    [id],
  )
  return rows[0] || null
}
