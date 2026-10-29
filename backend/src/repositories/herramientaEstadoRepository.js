import { pool } from '../db/pool.js'

/** Repositorio del historial de reparaciones de herramientas (HU-37). */

export async function listarReparaciones(herramientaId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.fecha_ingreso, r.descripcion, r.fecha_salida, r.costo, r.observaciones_salida,
            u.username AS ingresada_por
       FROM reparaciones_herramientas r JOIN usuarios u ON u.id = r.ingresado_por_usuario_id
      WHERE r.herramienta_id = ? ORDER BY r.fecha_ingreso DESC, r.id DESC`,
    [herramientaId],
  )
  return rows
}

/**
 * Aplica el cambio de estado en una transacción sobre la herramienta bloqueada.
 * `decidir(herramienta, reparacionAbierta, tienePrestamoVigente)` valida y
 * devuelve lo que se aplica.
 */
export async function cambiarEstado(herramientaId, usuarioId, decidir) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[h]] = await conn.query('SELECT * FROM herramientas WHERE id = ? FOR UPDATE', [herramientaId])
    const [[abierta]] = h
      ? await conn.query('SELECT * FROM reparaciones_herramientas WHERE herramienta_id = ? AND fecha_salida IS NULL LIMIT 1', [herramientaId])
      : [[null]]
    const [[vigente]] = h
      ? await conn.query(
        `SELECT COUNT(*) AS n FROM prestamos_herramientas
          WHERE herramienta_id = ? AND estado_prestamo IN ('ACTIVO', 'ATRASADO', 'CON_NOVEDAD')`, [herramientaId])
      : [[{ n: 0 }]]
    const plan = decidir(h, abierta, Number(vigente.n) > 0)

    if (plan.cerrarReparacion && abierta) {
      await conn.query(
        `UPDATE reparaciones_herramientas
            SET fecha_salida = COALESCE(?, NOW()), costo = ?, observaciones_salida = ?, salida_por_usuario_id = ?
          WHERE id = ?`,
        [plan.fechaSalida ?? null, plan.costo ?? null, plan.motivo, usuarioId, abierta.id],
      )
    }
    if (plan.nuevaReparacion) {
      await conn.query(
        `INSERT INTO reparaciones_herramientas (herramienta_id, descripcion, estado_previo, ingresado_por_usuario_id)
         VALUES (?, ?, ?, ?)`,
        [herramientaId, plan.motivo, h.estado_operativo, usuarioId],
      )
    }
    if (plan.baja) {
      await conn.query(
        `UPDATE herramientas
            SET activo = 0, fecha_baja = NOW(), baja_por_usuario_id = ?, disponibilidad = 'BAJA'
          WHERE id = ?`,
        [usuarioId, herramientaId],
      )
    } else {
      await conn.query('UPDATE herramientas SET estado_operativo = ? WHERE id = ?', [plan.estadoOperativo, herramientaId])
    }
    await conn.commit()
    return { anterior: h.estado_operativo, plan }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
