import { pool } from '../db/pool.js'
import { Trabajador } from '../entities/Trabajador.js'

/**
 * Repositorio de la tabla `trabajadores` (HU-04, HU-02).
 */

/**
 * HU-04: el cargo y la especialidad ya no son texto libre, viven en las tablas
 * de dominio `cargos` y `especialidades`. Se siguen exponiendo por su nombre
 * (contrato que ya usan la interfaz y las pruebas) y se añaden los ids para que
 * el formulario los seleccione en un combo.
 */
const CAMPOS = `t.id, t.numero_documento, t.tipo_documento, t.nombres, t.apellidos,
                t.email, t.telefono, t.direccion,
                t.cargo_id, c.nombre AS cargo, c.operativo AS cargo_operativo,
                t.especialidad_id, e.nombre AS especialidad,
                t.disponible, t.estado, t.activo`

const DESDE = `FROM trabajadores t
               JOIN cargos c ON c.id = t.cargo_id
               LEFT JOIN especialidades e ON e.id = t.especialidad_id`

export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} ${DESDE} WHERE t.id = ? LIMIT 1`,
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
 * Lista el catálogo de personal.
 *
 * Por defecto solo activos (HU-18: los registros dados de baja no aparecen
 * salvo petición explícita). El volumen de personal obliga a poder buscar y
 * filtrar desde la API (no solo en el navegador): `buscar` cruza nombres,
 * apellidos, documento, correo, cargo y especialidad; `estado` y `cargo_id`
 * filtran por columnas, y `disponible` por la bandera derivada.
 */
export async function listar({
  incluirInactivos = false,
  buscar = '',
  estado = '',
  cargoId = null,
  disponible = null,
} = {}) {
  const condiciones = []
  const params = []

  if (!incluirInactivos) condiciones.push('t.activo = 1')

  const texto = String(buscar ?? '').trim()
  if (texto) {
    condiciones.push(
      `(t.nombres LIKE ? OR t.apellidos LIKE ? OR t.numero_documento LIKE ?
        OR t.email LIKE ? OR c.nombre LIKE ? OR e.nombre LIKE ?)`,
    )
    const patron = `%${texto}%`
    params.push(patron, patron, patron, patron, patron, patron)
  }

  if (estado) {
    condiciones.push('t.estado = ?')
    params.push(estado)
  }
  if (cargoId) {
    condiciones.push('t.cargo_id = ?')
    params.push(cargoId)
  }
  if (disponible !== null && disponible !== undefined && disponible !== '') {
    condiciones.push('t.disponible = ?')
    params.push(Number(disponible) ? 1 : 0)
  }

  const [rows] = await pool.query(
    `SELECT ${CAMPOS} ${DESDE}
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY t.apellidos, t.nombres`,
    params,
  )
  return rows.map(Trabajador.fromRow)
}

/**
 * Actividades vigentes asignadas al trabajador: sirven para decidir su
 * disponibilidad al volver a estado ACTIVO (regla de negocio del estado).
 */
export async function contarActividadesVigentes(id) {
  const [[fila]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM actividades
      WHERE responsable_id = ? AND activo = 1
        AND estado IN ('PENDIENTE', 'EN_PROCESO')`,
    [id],
  )
  return Number(fila?.total ?? 0)
}

export async function create(t) {
  const [result] = await pool.query(
    `INSERT INTO trabajadores
       (numero_documento, tipo_documento, nombres, apellidos, email, telefono,
        direccion, cargo_id, especialidad_id, disponible, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.numero_documento, t.tipo_documento, t.nombres, t.apellidos,
      t.email, t.telefono, t.direccion, t.cargo_id, t.especialidad_id,
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
