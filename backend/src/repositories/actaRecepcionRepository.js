import { pool } from '../db/pool.js'

/**
 * Repositorio de `actas_recepcion` y su detalle (HU-40).
 *
 * El acta nace al despachar la salida (ver `solicitudMaterialRepository`); aquí
 * se consulta y se firma. La firma se aplica en una transacción con bloqueo del
 * acta, para que dos confirmaciones simultáneas no la firmen dos veces.
 */

const SELECT = `SELECT a.id, a.salida_id, a.estado, a.firmada_por_usuario_id, a.firmada_en,
                       a.observaciones, a.creada_en,
                       CONCAT('SA-', LPAD(s.id, 5, '0')) AS comprobante,
                       s.proyecto_id, p.codigo AS proyecto_codigo, p.nombre AS proyecto,
                       p.responsable_id AS proyecto_responsable_id,
                       s.actividad_id, ac.nombre AS actividad,
                       ac.responsable_id AS actividad_responsable_id,
                       s.entregado_a_trabajador_id,
                       CONCAT(t.nombres, ' ', t.apellidos) AS entregado_a,
                       s.fecha_salida, s.almacen_origen_id, al.nombre AS almacen_origen,
                       COALESCE(CONCAT(td.nombres, ' ', td.apellidos), u.username) AS despachado_por,
                       COALESCE(CONCAT(tf.nombres, ' ', tf.apellidos), uf.username) AS firmada_por
                  FROM actas_recepcion a
                  JOIN salidas_materiales s ON s.id = a.salida_id
                  JOIN proyectos p ON p.id = s.proyecto_id
                  LEFT JOIN actividades ac ON ac.id = s.actividad_id
                  JOIN trabajadores t ON t.id = s.entregado_a_trabajador_id
                  JOIN almacenes al ON al.id = s.almacen_origen_id
                  JOIN usuarios u ON u.id = s.despachado_por_usuario_id
                  LEFT JOIN trabajadores td ON td.id = u.trabajador_id
                  LEFT JOIN usuarios uf ON uf.id = a.firmada_por_usuario_id
                  LEFT JOIN trabajadores tf ON tf.id = uf.trabajador_id`

async function conDetalles(actas) {
  if (actas.length === 0) return actas
  const [detalles] = await pool.query(
    `SELECT d.id, d.acta_id, d.material_id, m.codigo AS material_codigo,
            m.descripcion AS material, m.unidad_medida,
            d.cantidad_despachada, d.cantidad_recibida, d.observacion
       FROM actas_recepcion_detalle d
       JOIN materiales m ON m.id = d.material_id
      WHERE d.acta_id IN (?) ORDER BY d.id`,
    [actas.map((a) => a.id)],
  )
  return actas.map((a) => {
    const lineas = detalles
      .filter((d) => d.acta_id === a.id)
      .map((d) => ({
        ...d,
        cantidad_despachada: Number(d.cantidad_despachada),
        cantidad_recibida: d.cantidad_recibida === null ? null : Number(d.cantidad_recibida),
        diferencia:
          d.cantidad_recibida !== null && Number(d.cantidad_recibida) !== Number(d.cantidad_despachada),
      }))
    return {
      ...a,
      detalles: lineas,
      con_diferencias: lineas.some((d) => d.diferencia),
      pendiente: a.estado === 'PENDIENTE',
    }
  })
}

/**
 * Lista las actas con filtros. `alcance` limita al maestro a los proyectos donde
 * es responsable o está asignado (el acta también le llega si es responsable de
 * la actividad); bodega, gerente y administrador ven todas.
 */
export async function listar({ estado = '', salidaId = null, alcance = null } = {}) {
  const condiciones = []
  const params = []
  if (estado) { condiciones.push('a.estado = ?'); params.push(estado) }
  if (salidaId) { condiciones.push('a.salida_id = ?'); params.push(salidaId) }
  if (alcance && !alcance.total) {
    condiciones.push(`(p.responsable_id = ? OR EXISTS (
      SELECT 1 FROM asignaciones_personal ap
       WHERE ap.proyecto_id = p.id AND ap.trabajador_id = ? AND ap.estado = 'ACTIVO')
      OR EXISTS (
      SELECT 1 FROM actividades ac2 JOIN etapas_proyecto e2 ON e2.id = ac2.etapa_id
       WHERE e2.proyecto_id = p.id AND ac2.responsable_id = ? AND ac2.activo = 1))`)
    params.push(alcance.trabajadorId ?? 0, alcance.trabajadorId ?? 0, alcance.trabajadorId ?? 0)
  }
  const [rows] = await pool.query(
    `${SELECT} ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
      ORDER BY a.creada_en DESC, a.id DESC`,
    params,
  )
  return conDetalles(rows)
}

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE a.id = ? LIMIT 1`, [id])
  return (await conDetalles(rows))[0] || null
}

/**
 * Firma el acta y sus líneas. Devuelve `{ aplicada }`; si el acta ya estaba
 * firmada (o no existe) no toca nada.
 */
export async function firmar(id, { usuarioId, observaciones = null, lineas = [] }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[acta]] = await conn.query('SELECT * FROM actas_recepcion WHERE id = ? FOR UPDATE', [id])
    if (!acta || acta.estado === 'FIRMADA') {
      await conn.rollback()
      return { aplicada: false, inexistente: !acta }
    }
    for (const l of lineas) {
      await conn.query(
        `UPDATE actas_recepcion_detalle
            SET cantidad_recibida = ?, observacion = ?
          WHERE id = ? AND acta_id = ?`,
        [l.cantidad_recibida, l.observacion ?? null, l.detalle_id, id],
      )
    }
    await conn.query(
      `UPDATE actas_recepcion
          SET estado = 'FIRMADA', firmada_por_usuario_id = ?, firmada_en = NOW(), observaciones = ?
        WHERE id = ?`,
      [usuarioId ?? null, observaciones, id],
    )
    await conn.commit()
    return { aplicada: true }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/** Bodega recibe el aviso de diferencia dentro de la aplicación. */
export async function notificarBodega({ actaId, titulo, mensaje }) {
  const [usuarios] = await pool.query(
    `SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE r.nombre = 'ENCARGADO_BODEGA' AND u.activo = 1 AND u.estado = 'ACTIVO'`,
  )
  for (const u of usuarios) {
    await pool.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, referencia_id, tabla_referencia)
       VALUES (?, ?, ?, ?, 'actas_recepcion')`,
      [u.id, titulo, mensaje, actaId],
    )
  }
  return usuarios.length
}
