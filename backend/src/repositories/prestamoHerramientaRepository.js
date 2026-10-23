import { pool } from '../db/pool.js'

/** Repositorio de la tabla `prestamos_herramientas` (HU-11). */
export async function listar({ estado = '' } = {}) {
  const params = []
  let where = ''
  if (estado) { where = 'WHERE p.estado_prestamo = ?'; params.push(estado) }
  const [rows] = await pool.query(
    `SELECT p.id, p.solicitud_id, s.codigo AS solicitud, h.codigo_serial, h.nombre AS herramienta,
            CONCAT(t.nombres, ' ', t.apellidos) AS trabajador, pr.nombre AS proyecto,
            p.fecha_prestamo, p.fecha_estimada_devolucion, p.fecha_real_devolucion,
            p.estado_entrega, p.estado_devolucion, p.estado_prestamo
       FROM prestamos_herramientas p
       JOIN herramientas h ON h.id = p.herramienta_id
       JOIN trabajadores t ON t.id = p.trabajador_id
       JOIN proyectos pr ON pr.id = p.proyecto_id
       LEFT JOIN solicitudes_herramientas s ON s.id = p.solicitud_id
       ${where}
      ORDER BY p.fecha_prestamo DESC, p.id DESC`,
    params,
  )
  return rows
}

/**
 * Registra la entrega en una sola transacción: bloquea la solicitud y la
 * herramienta, inserta el préstamo, marca la herramienta como PRESTADA y la
 * solicitud como ENTREGADA. `validar(solicitud, herramienta)` lanza si no procede y devuelve la fecha estimada de devolución.
 */
export async function entregar({ solicitudId, usuarioId, estadoEntrega, observaciones, validar }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[sol]] = await conn.query('SELECT * FROM solicitudes_herramientas WHERE id = ? AND activo = 1 FOR UPDATE', [solicitudId])
    const [[herr]] = sol
      ? await conn.query('SELECT * FROM herramientas WHERE id = ? FOR UPDATE', [sol.herramienta_id])
      : [[null]]
    const fechaDevolucion = await validar(sol, herr)
    const [ins] = await conn.query(
      `INSERT INTO prestamos_herramientas
         (solicitud_id, herramienta_id, trabajador_id, proyecto_id, entregado_por_usuario_id,
          fecha_estimada_devolucion, estado_entrega, observaciones_entrega)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sol.id, sol.herramienta_id, sol.para_trabajador_id, sol.proyecto_id, usuarioId, fechaDevolucion, estadoEntrega, observaciones],
    )
    await conn.query("UPDATE herramientas SET disponibilidad = 'PRESTADA' WHERE id = ?", [sol.herramienta_id])
    await conn.query("UPDATE solicitudes_herramientas SET estado = 'ENTREGADA' WHERE id = ?", [sol.id])
    await conn.commit()
    return { id: ins.insertId, solicitud: sol, herramienta: herr }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT p.id, p.solicitud_id, h.codigo_serial, h.nombre AS herramienta, CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
            pr.nombre AS proyecto, p.fecha_prestamo, p.fecha_estimada_devolucion, p.estado_entrega, p.estado_prestamo,
            p.observaciones_entrega
       FROM prestamos_herramientas p
       JOIN herramientas h ON h.id = p.herramienta_id
       JOIN trabajadores t ON t.id = p.trabajador_id
       JOIN proyectos pr ON pr.id = p.proyecto_id
      WHERE p.id = ? LIMIT 1`, [id])
  return rows[0] || null
}
