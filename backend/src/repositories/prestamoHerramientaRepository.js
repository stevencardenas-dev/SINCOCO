import { pool } from '../db/pool.js'

/** Repositorio de la tabla `prestamos_herramientas` (HU-11 y HU-35). */

const SELECT = `SELECT p.id, p.solicitud_id, s.codigo AS solicitud, p.herramienta_id, h.codigo_serial, h.nombre AS herramienta,
                       p.trabajador_id, CONCAT(t.nombres, ' ', t.apellidos) AS trabajador, pr.nombre AS proyecto,
                       p.fecha_prestamo, p.fecha_estimada_devolucion, p.fecha_real_devolucion,
                       p.estado_entrega, p.estado_devolucion, p.estado_prestamo,
                       COALESCE(CONCAT(te.nombres, ' ', te.apellidos), ue.username) AS entregado_por, p.observaciones_entrega,
                       COALESCE(CONCAT(tr.nombres, ' ', tr.apellidos), ur.username) AS recibido_por, p.observaciones_devolucion,
                       p.prestamo_origen_id, CONCAT(ho.nombre, ' (', ho.codigo_serial, ')') AS reemplaza_a,
                       (SELECT CONCAT(h2.nombre, ' (', h2.codigo_serial, ')') FROM prestamos_herramientas r
                          JOIN herramientas h2 ON h2.id = r.herramienta_id WHERE r.prestamo_origen_id = p.id LIMIT 1) AS reemplazado_por,
                       p.incidencia_id
                  FROM prestamos_herramientas p
                  JOIN herramientas h ON h.id = p.herramienta_id
                  JOIN trabajadores t ON t.id = p.trabajador_id
                  JOIN proyectos pr ON pr.id = p.proyecto_id
                  LEFT JOIN usuarios ue ON ue.id = p.entregado_por_usuario_id
                  LEFT JOIN trabajadores te ON te.id = ue.trabajador_id
                  LEFT JOIN usuarios ur ON ur.id = p.recibido_por_usuario_id
                  LEFT JOIN trabajadores tr ON tr.id = ur.trabajador_id
                  LEFT JOIN prestamos_herramientas po ON po.id = p.prestamo_origen_id
                  LEFT JOIN herramientas ho ON ho.id = po.herramienta_id
                  LEFT JOIN solicitudes_herramientas s ON s.id = p.solicitud_id`

export async function listar({ estado = '', herramientaId = null } = {}) {
  const condiciones = []
  const params = []
  if (estado) { condiciones.push('p.estado_prestamo = ?'); params.push(estado) }
  if (herramientaId) { condiciones.push('p.herramienta_id = ?'); params.push(herramientaId) }
  const [rows] = await pool.query(
    `${SELECT} ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''} ORDER BY p.fecha_prestamo DESC, p.id DESC`,
    params,
  )
  return rows
}

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE p.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

/**
 * Registra la entrega en una sola transacción: bloquea la solicitud y la
 * herramienta, inserta el préstamo, marca la herramienta como PRESTADA y la
 * solicitud como ENTREGADA. `validar(solicitud, herramienta)` lanza si no procede y devuelve la fecha estimada de devolución.
 */
export async function entregar({ solicitudId, usuarioId, observaciones, validar }) {
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
      [sol.id, sol.herramienta_id, sol.para_trabajador_id, sol.proyecto_id, usuarioId, fechaDevolucion, herr.estado_operativo, observaciones],
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

/** Herramientas que pueden reemplazar a la del préstamo: activas, disponibles y en estado prestable (las del mismo nombre primero). */
export async function reemplazosDisponibles(herramientaAveriadaId) {
  const [rows] = await pool.query(
    `SELECT h.id, h.codigo_serial, h.nombre, h.marca, h.modelo, a.nombre AS almacen, h.estado_operativo,
            (h.nombre = (SELECT nombre FROM herramientas WHERE id = ?)) AS equivalente
       FROM herramientas h JOIN almacenes a ON a.id = h.almacen_id
      WHERE h.activo = 1 AND h.disponibilidad = 'DISPONIBLE' AND h.estado_operativo IN ('EXCELENTE', 'BUENO', 'REGULAR') AND h.id <> ?
      ORDER BY equivalente DESC, h.nombre, h.codigo_serial`,
    [herramientaAveriadaId, herramientaAveriadaId],
  )
  return rows.map((r) => ({ ...r, equivalente: Boolean(r.equivalente) }))
}

/**
 * HU-35: reemplazo por avería en una sola transacción. Cierra el préstamo averiado (devuelto, condición dañada,
 * con quién recibe), manda esa herramienta a reparación (HU-37), genera la incidencia y, si hay reemplazo, lo entrega
 * al mismo trabajador y proyecto con la misma fecha estimada de devolución, vinculado al préstamo original.
 * `validar({ prestamo, herramienta, reemplazo })` lanza si no procede y devuelve { titulo, descripcion } de la incidencia.
 */
export async function reemplazar({ prestamoId, reemplazoId, usuarioId, novedad, validar }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[prestamo]] = await conn.query('SELECT * FROM prestamos_herramientas WHERE id = ? FOR UPDATE', [prestamoId])
    const [[herramienta]] = prestamo
      ? await conn.query('SELECT * FROM herramientas WHERE id = ? FOR UPDATE', [prestamo.herramienta_id])
      : [[null]]
    const [[reemplazo]] = reemplazoId ? await conn.query('SELECT * FROM herramientas WHERE id = ? FOR UPDATE', [reemplazoId]) : [[null]]
    const incidencia = validar({ prestamo, herramienta, reemplazo })

    const [inc] = await conn.query(
      `INSERT INTO incidencias (proyecto_id, reportado_por_usuario_id, tipo, titulo, descripcion, severidad)
       VALUES (?, ?, 'AVERIA', ?, ?, 'MEDIA')`,
      [prestamo.proyecto_id, usuarioId, incidencia.titulo, incidencia.descripcion],
    )
    await conn.query(
      `UPDATE prestamos_herramientas
          SET estado_prestamo = 'DEVUELTO', fecha_real_devolucion = NOW(), estado_devolucion = 'DANIADA',
              recibido_por_usuario_id = ?, observaciones_devolucion = ?, incidencia_id = ?
        WHERE id = ?`,
      [usuarioId, novedad, inc.insertId, prestamoId],
    )
    // HU-37: la averiada pasa a reparación (queda registrada en su historial de reparaciones).
    await conn.query(
      `INSERT INTO reparaciones_herramientas (herramienta_id, descripcion, estado_previo, ingresado_por_usuario_id)
       VALUES (?, ?, ?, ?)`,
      [herramienta.id, novedad, herramienta.estado_operativo, usuarioId],
    )
    await conn.query("UPDATE herramientas SET estado_operativo = 'EN_MANTENIMIENTO', disponibilidad = 'DISPONIBLE' WHERE id = ?", [herramienta.id])

    let reemplazoPrestamoId = null
    if (reemplazo) {
      const [ins] = await conn.query(
        `INSERT INTO prestamos_herramientas
           (prestamo_origen_id, herramienta_id, trabajador_id, proyecto_id, entregado_por_usuario_id,
            fecha_estimada_devolucion, estado_entrega, observaciones_entrega)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [prestamoId, reemplazo.id, prestamo.trabajador_id, prestamo.proyecto_id, usuarioId, prestamo.fecha_estimada_devolucion,
         reemplazo.estado_operativo, `Reemplazo por avería de ${herramienta.nombre} (${herramienta.codigo_serial})`],
      )
      reemplazoPrestamoId = ins.insertId
      await conn.query("UPDATE herramientas SET disponibilidad = 'PRESTADA' WHERE id = ?", [reemplazo.id])
    }
    await conn.commit()
    return { incidenciaId: inc.insertId, reemplazoPrestamoId, prestamo, herramienta, reemplazo }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
