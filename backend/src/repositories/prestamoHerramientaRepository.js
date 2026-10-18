import { pool } from '../db/pool.js'

/** Repositorio de la tabla `prestamos_herramientas` (HU-11, solo lectura). */
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
