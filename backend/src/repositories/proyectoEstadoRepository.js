import { pool } from '../db/pool.js'

/**
 * Repositorio de las transiciones de estado de un proyecto (HU-38).
 *
 * Solo consulta y escritura del estado y de lo que estorba para finalizar:
 * préstamos de herramientas vigentes, solicitudes pendientes y asignaciones
 * activas por cerrar. Las reglas viven en `services/proyectoEstadoService.js`.
 */

export async function estadoDeProyecto(proyectoId) {
  const [rows] = await pool.query(
    `SELECT id, codigo, nombre, estado, activo, porcentaje_avance_total, presupuesto_inicial
       FROM proyectos WHERE id = ? LIMIT 1`,
    [proyectoId],
  )
  return rows[0] ?? null
}

export async function cambiarEstado(proyectoId, estado) {
  await pool.query('UPDATE proyectos SET estado = ? WHERE id = ?', [estado, proyectoId])
}

/** Préstamos de herramientas que siguen abiertos en el proyecto. */
export async function prestamosVigentes(proyectoId) {
  const [[fila]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM prestamos_herramientas
      WHERE proyecto_id = ? AND fecha_real_devolucion IS NULL
        AND estado_prestamo IN ('ACTIVO', 'ATRASADO')`,
    [proyectoId],
  )
  return Number(fila?.total ?? 0)
}

/** Solicitudes de materiales y de herramientas que aún no se resolvieron. */
export async function solicitudesPendientes(proyectoId) {
  const [[fila]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM solicitudes_materiales
         WHERE proyecto_id = ? AND estado IN ('PENDIENTE', 'APROBADA', 'DESPACHADA_PARCIAL')) AS materiales,
       (SELECT COUNT(*) FROM solicitudes_herramientas
         WHERE proyecto_id = ? AND estado IN ('PENDIENTE', 'APROBADA')) AS herramientas`,
    [proyectoId, proyectoId],
  )
  return {
    materiales: Number(fila?.materiales ?? 0),
    herramientas: Number(fila?.herramientas ?? 0),
  }
}

/** Cierra las asignaciones vigentes del proyecto con su fecha fin real. */
export async function cerrarAsignaciones(proyectoId, fecha) {
  const [r] = await pool.query(
    `UPDATE asignaciones_personal
        SET estado = 'FINALIZADO', fecha_fin_real = ?
      WHERE proyecto_id = ? AND estado = 'ACTIVO' AND fecha_fin_real IS NULL`,
    [fecha, proyectoId],
  )
  return r.affectedRows
}
