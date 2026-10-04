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
                t.disponible, t.estado, t.activo, t.fecha_baja`

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

/**
 * Responsabilidades en curso que impiden dar de baja al trabajador: proyectos
 * activos que no han terminado y actividades activas sin completar de las que
 * es responsable (solo en proyectos que siguen en curso).
 */
export async function responsabilidadesEnCurso(id) {
  const [proyectos] = await pool.query(
    `SELECT codigo, nombre, estado
       FROM proyectos
      WHERE responsable_id = ? AND activo = 1
        AND estado IN ('PLANIFICACION', 'EN_EJECUCION', 'PAUSADO')
      ORDER BY nombre`,
    [id],
  )
  const [actividades] = await pool.query(
    `SELECT a.nombre, a.estado, p.nombre AS proyecto
       FROM actividades a
       JOIN etapas_proyecto e ON e.id = a.etapa_id
       JOIN proyectos p ON p.id = e.proyecto_id
      WHERE a.responsable_id = ? AND a.activo = 1 AND a.estado <> 'COMPLETADA'
        AND e.activo = 1
        AND p.activo = 1 AND p.estado IN ('PLANIFICACION', 'EN_EJECUCION', 'PAUSADO')
      ORDER BY p.nombre, a.nombre`,
    [id],
  )
  return { proyectos, actividades }
}

/** Cuenta de acceso vinculada al trabajador (cada trabajador tiene una como máximo). */
export async function cuentaVinculada(id) {
  const [rows] = await pool.query(
    'SELECT id, username, estado, activo, fecha_baja FROM usuarios WHERE trabajador_id = ? LIMIT 1',
    [id],
  )
  return rows[0] ?? null
}

/**
 * Baja lógica del trabajador (HU-18): queda INACTIVO, no disponible, con fecha y
 * usuario de la baja. Si tiene una cuenta activa, la cuenta se da de baja en la
 * misma transacción, con la MISMA fecha: así la reactivación sabe qué cuentas
 * cerró esta baja y no reabre una que el administrador bloqueó por su cuenta.
 * Devuelve las filas afectadas del trabajador (0 si ya estaba de baja).
 */
export async function darDeBajaConCuenta({ id, usuarioId, cuentaId }) {
  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    const [resultado] = await conexion.query(
      `UPDATE trabajadores
          SET activo = 0, fecha_baja = NOW(), baja_por_usuario_id = ?,
              estado = 'INACTIVO', disponible = 0
        WHERE id = ? AND activo = 1`,
      [usuarioId ?? null, id],
    )
    if (resultado.affectedRows && cuentaId) {
      // La cuenta copia la fecha exacta del trabajador (ver reactivarConCuenta).
      await conexion.query(
        `UPDATE usuarios
            SET activo = 0, baja_por_usuario_id = ?, estado = 'INACTIVO', sesion_actual = NULL,
                fecha_baja = (SELECT fecha_baja FROM trabajadores WHERE id = ?)
          WHERE id = ? AND activo = 1 AND estado = 'ACTIVO'`,
        [usuarioId ?? null, id, cuentaId],
      )
    }
    await conexion.commit()
    return resultado.affectedRows
  } catch (error) {
    await conexion.rollback()
    throw error
  } finally {
    conexion.release()
  }
}

/**
 * Reactiva al trabajador como ACTIVO con la disponibilidad indicada y, si su
 * cuenta se cerró con esta misma baja (misma fecha), también la reabre.
 * Devuelve { afectadas, cuentaReactivada }.
 */
export async function reactivarConCuenta({ id, disponible }) {
  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    // Primero la cuenta: se compara con la fecha de baja del trabajador antes de
    // borrarla. Solo se reabre si se cerró con esta baja (misma fecha).
    const [cuenta] = await conexion.query(
      `UPDATE usuarios u
         JOIN trabajadores t ON t.id = u.trabajador_id
          SET u.activo = 1, u.fecha_baja = NULL, u.baja_por_usuario_id = NULL, u.estado = 'ACTIVO'
        WHERE t.id = ? AND t.activo = 0 AND u.activo = 0 AND u.fecha_baja = t.fecha_baja`,
      [id],
    )
    const [resultado] = await conexion.query(
      `UPDATE trabajadores
          SET activo = 1, fecha_baja = NULL, baja_por_usuario_id = NULL,
              estado = 'ACTIVO', disponible = ?
        WHERE id = ? AND activo = 0`,
      [disponible, id],
    )
    if (!resultado.affectedRows) {
      await conexion.rollback()
      return { afectadas: 0, cuentaReactivada: false }
    }
    await conexion.commit()
    return { afectadas: 1, cuentaReactivada: cuenta.affectedRows > 0 }
  } catch (error) {
    await conexion.rollback()
    throw error
  } finally {
    conexion.release()
  }
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
