import { pool } from '../db/pool.js'

/** Repositorio de `consumos_materiales` (HU-20). */

const SELECT = `SELECT c.id, CONCAT('CM-', LPAD(c.id, 5, '0')) AS comprobante,
                       c.actividad_id, a.nombre AS actividad, e.proyecto_id, p.nombre AS proyecto,
                       c.material_id, m.codigo AS material_codigo, m.descripcion AS material, m.unidad_medida,
                       c.cantidad, c.costo_unitario, c.costo_total, c.fecha_consumo,
                       c.registrado_por_usuario_id, u.username AS registrado_por, c.observaciones, c.estado,
                       c.anulacion_motivo, c.anulacion_solicitada_en, c.anulacion_resuelta_en, c.anulacion_observacion,
                       ur.username AS anulacion_resuelta_por
                  FROM consumos_materiales c
                  JOIN actividades a ON a.id = c.actividad_id
                  JOIN etapas_proyecto e ON e.id = a.etapa_id
                  JOIN proyectos p ON p.id = e.proyecto_id
                  JOIN materiales m ON m.id = c.material_id
                  JOIN usuarios u ON u.id = c.registrado_por_usuario_id
                  LEFT JOIN usuarios ur ON ur.id = c.anulacion_resuelta_por_usuario_id`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE c.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function listar({ usuarioId = null, estado = '' } = {}) {
  const condiciones = []
  const params = []
  if (usuarioId) { condiciones.push('c.registrado_por_usuario_id = ?'); params.push(usuarioId) }
  if (estado) { condiciones.push('c.estado = ?'); params.push(estado) }
  const [rows] = await pool.query(
    `${SELECT} ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''} ORDER BY c.fecha_consumo DESC, c.id DESC`,
    params,
  )
  return rows
}

/** Actividad con su proyecto, para validar el acceso. */
export async function findActividad(actividadId) {
  const [rows] = await pool.query(
    `SELECT a.id, a.nombre, a.activo, e.proyecto_id FROM actividades a JOIN etapas_proyecto e ON e.id = a.etapa_id
      WHERE a.id = ? LIMIT 1`,
    [actividadId],
  )
  return rows[0] || null
}

/**
 * Materiales despachados a la actividad con lo que todavía se puede consumir:
 * despachado (salidas a la actividad) - devuelto (devoluciones desde la actividad) - consumido vigente.
 * El costo unitario es el promedio ponderado de lo despachado.
 */
export async function disponiblesDeActividad(actividadId) {
  const [rows] = await pool.query(
    `SELECT d.material_id, m.codigo AS material_codigo, m.descripcion AS material, m.unidad_medida,
            SUM(d.cantidad_despachada) AS despachado,
            ROUND(SUM(d.cantidad_despachada * d.costo_unitario_momento) / SUM(d.cantidad_despachada), 2) AS costo_unitario,
            COALESCE((SELECT SUM(v.cantidad) FROM devoluciones_materiales v
                       WHERE v.actividad_id = s.actividad_id AND v.material_id = d.material_id), 0) AS devuelto,
            COALESCE((SELECT SUM(c.cantidad) FROM consumos_materiales c
                       WHERE c.actividad_id = s.actividad_id AND c.material_id = d.material_id
                         AND c.estado IN ('REGISTRADO', 'ANULACION_SOLICITADA')), 0) AS consumido
       FROM detalles_salida_materiales d
       JOIN salidas_materiales s ON s.id = d.salida_id
       JOIN materiales m ON m.id = d.material_id
      WHERE s.actividad_id = ?
      GROUP BY d.material_id, m.codigo, m.descripcion, m.unidad_medida, s.actividad_id
      ORDER BY m.codigo`,
    [actividadId],
  )
  return rows.map((r) => {
    const despachado = Number(r.despachado)
    const devuelto = Number(r.devuelto)
    const consumido = Number(r.consumido)
    return {
      ...r, despachado, devuelto, consumido, costo_unitario: Number(r.costo_unitario),
      disponible: Math.round((despachado - devuelto - consumido) * 100) / 100,
    }
  })
}

/**
 * Registra el consumo en una transacción: bloquea la actividad (para que dos consumos simultáneos no superen
 * lo despachado), valida con lo despachado, devuelto y consumido (`validar`) y lo inserta con su costo.
 */
export async function registrar({ actividadId, materialId, usuarioId, cantidad, observaciones, validar }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[actividad]] = await conn.query('SELECT id, activo FROM actividades WHERE id = ? FOR UPDATE', [actividadId])
    const [[material]] = await conn.query('SELECT id, activo FROM materiales WHERE id = ?', [materialId])
    const [[sal]] = await conn.query(
      `SELECT COALESCE(SUM(d.cantidad_despachada), 0) AS despachado,
              COALESCE(ROUND(SUM(d.cantidad_despachada * d.costo_unitario_momento) / NULLIF(SUM(d.cantidad_despachada), 0), 2), 0) AS costo
         FROM detalles_salida_materiales d JOIN salidas_materiales s ON s.id = d.salida_id
        WHERE s.actividad_id = ? AND d.material_id = ?`,
      [actividadId, materialId],
    )
    const [[dev]] = await conn.query(
      'SELECT COALESCE(SUM(cantidad), 0) AS devuelto FROM devoluciones_materiales WHERE actividad_id = ? AND material_id = ?',
      [actividadId, materialId],
    )
    const [[con]] = await conn.query(
      `SELECT COALESCE(SUM(cantidad), 0) AS consumido FROM consumos_materiales
        WHERE actividad_id = ? AND material_id = ? AND estado IN ('REGISTRADO', 'ANULACION_SOLICITADA')`,
      [actividadId, materialId],
    )
    const costoUnitario = validar({
      actividad, material, despachado: Number(sal.despachado), devuelto: Number(dev.devuelto), consumido: Number(con.consumido), costo: Number(sal.costo),
    })
    const costoTotal = Math.round(cantidad * costoUnitario * 100) / 100
    const [ins] = await conn.query(
      `INSERT INTO consumos_materiales (actividad_id, material_id, cantidad, costo_unitario, costo_total, registrado_por_usuario_id, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [actividadId, materialId, cantidad, costoUnitario, costoTotal, usuarioId, observaciones],
    )
    await conn.commit()
    return ins.insertId
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/** Cambia el estado solo si sigue en uno de los esperados (evita doble resolución). */
export async function cambiarEstado(id, desde, hacia, campos = {}) {
  const sets = ['estado = ?']
  const params = [hacia]
  for (const [columna, valor] of Object.entries(campos)) { sets.push(`${columna} = ?`); params.push(valor) }
  params.push(id, desde)
  const [r] = await pool.query(`UPDATE consumos_materiales SET ${sets.join(', ')} WHERE id = ? AND estado IN (?)`, params)
  return r.affectedRows > 0
}

/** Costo de materiales consumidos por actividad del proyecto (solo consumos vigentes) y total del proyecto. */
export async function consolidacion(proyectoId) {
  const [actividades] = await pool.query(
    `SELECT a.id AS actividad_id, a.nombre AS actividad,
            COALESCE(SUM(c.costo_total), 0) AS costo_materiales, COUNT(c.id) AS consumos
       FROM actividades a
       JOIN etapas_proyecto e ON e.id = a.etapa_id
       LEFT JOIN consumos_materiales c ON c.actividad_id = a.id AND c.estado IN ('REGISTRADO', 'ANULACION_SOLICITADA')
      WHERE e.proyecto_id = ? AND a.activo = 1 AND e.activo = 1
      GROUP BY a.id, a.nombre, e.id ORDER BY e.id, a.id`,
    [proyectoId],
  )
  return actividades.map((a) => ({ ...a, costo_materiales: Number(a.costo_materiales), consumos: Number(a.consumos) }))
}
