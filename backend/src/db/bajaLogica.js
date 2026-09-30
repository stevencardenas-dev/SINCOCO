import { pool } from './pool.js'

/**
 * HU-18 · RN07: ninguna operación de eliminación sobre entidades de negocio
 * ejecuta un borrado físico. En su lugar se marca el registro como inactivo,
 * se registra la fecha de baja y el usuario que la ejecuta, conservando
 * íntegras las relaciones para preservar la trazabilidad histórica.
 *
 * La tabla se valida contra una lista blanca porque no puede parametrizarse
 * como un valor más de la consulta.
 */
const TABLAS_PERMITIDAS = new Set([
  'proyectos',
  'trabajadores',
  'etapas_proyecto',
  'actividades',
  'usuarios',
  'clientes',
  'cargos',
  'especialidades',
])

function validarTabla(tabla) {
  if (!TABLAS_PERMITIDAS.has(tabla)) {
    throw new Error(`bajaLogica: tabla no permitida "${tabla}"`)
  }
}

/** Marca el registro como inactivo. Devuelve las filas afectadas. */
export async function darDeBaja({ tabla, id, usuarioId }) {
  validarTabla(tabla)
  // Las cuentas de usuario además quedan en estado INACTIVO para que no puedan
  // autenticarse (HU-01), sin borrar el historial.
  const extra = tabla === 'usuarios' ? ", estado = 'INACTIVO'" : ''
  const [result] = await pool.query(
    `UPDATE ${tabla}
        SET activo = 0, fecha_baja = NOW(), baja_por_usuario_id = ?${extra}
      WHERE id = ? AND activo = 1`,
    [usuarioId ?? null, id],
  )
  return result.affectedRows
}

/** Reactiva un registro dado de baja previamente. */
export async function reactivar({ tabla, id }) {
  validarTabla(tabla)
  const extra = tabla === 'usuarios' ? ", estado = 'ACTIVO'" : ''
  const [result] = await pool.query(
    `UPDATE ${tabla}
        SET activo = 1, fecha_baja = NULL, baja_por_usuario_id = NULL${extra}
      WHERE id = ? AND activo = 0`,
    [id],
  )
  return result.affectedRows
}
