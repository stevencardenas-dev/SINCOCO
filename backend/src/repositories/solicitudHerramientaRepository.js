import { pool } from '../db/pool.js'

/** Repositorio de la tabla `solicitudes_herramientas` (HU-30). */

const SELECT = `SELECT s.id, s.codigo, s.herramienta_id, h.codigo_serial, h.nombre AS herramienta,
                       s.proyecto_id, p.nombre AS proyecto, s.para_trabajador_id,
                       CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
                       s.solicitado_por_usuario_id, COALESCE(CONCAT(ts.nombres, ' ', ts.apellidos), u.username) AS solicitante,
                       s.fecha_solicitud, s.fecha_requerida, s.estado, s.observaciones
                  FROM solicitudes_herramientas s
                  JOIN herramientas h ON h.id = s.herramienta_id
                  JOIN proyectos p ON p.id = s.proyecto_id
                  JOIN trabajadores t ON t.id = s.para_trabajador_id
                  JOIN usuarios u ON u.id = s.solicitado_por_usuario_id
                  LEFT JOIN trabajadores ts ON ts.id = u.trabajador_id`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE s.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function listar({ usuarioId = null, estado = '' } = {}) {
  const condiciones = ['s.activo = 1']
  const params = []
  if (usuarioId) { condiciones.push('s.solicitado_por_usuario_id = ?'); params.push(usuarioId) }
  if (estado) { condiciones.push('s.estado = ?'); params.push(estado) }
  const [rows] = await pool.query(
    `${SELECT} WHERE ${condiciones.join(' AND ')} ORDER BY s.fecha_solicitud DESC, s.id DESC`,
    params,
  )
  return rows
}

export async function crear({ herramientaId, proyectoId, usuarioId, trabajadorId, fechaRequerida, observaciones }) {
  // El código definitivo depende del id; mientras tanto va uno temporal único.
  const temporal = `TMP-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const [r] = await pool.query(
    `INSERT INTO solicitudes_herramientas
       (codigo, herramienta_id, proyecto_id, solicitado_por_usuario_id, para_trabajador_id, fecha_requerida, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [temporal, herramientaId, proyectoId, usuarioId, trabajadorId, fechaRequerida, observaciones],
  )
  await pool.query('UPDATE solicitudes_herramientas SET codigo = ? WHERE id = ?', [
    `SH-${String(r.insertId).padStart(5, '0')}`, r.insertId,
  ])
  return r.insertId
}

/** Cambia el estado solo si sigue en el estado esperado (evita doble resolución). */
export async function cambiarEstado(id, desde, hacia, observaciones) {
  const [r] = await pool.query(
    `UPDATE solicitudes_herramientas
        SET estado = ?, observaciones = COALESCE(?, observaciones)
      WHERE id = ? AND estado = ?`,
    [hacia, observaciones ?? null, id, desde],
  )
  return r.affectedRows > 0
}
