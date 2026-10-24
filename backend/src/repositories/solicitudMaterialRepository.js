import { pool } from '../db/pool.js'

/** Repositorio de `solicitudes_materiales` y `detalles_solicitud_materiales` (HU-08). */

const SELECT = `SELECT s.id, s.codigo, s.proyecto_id, p.nombre AS proyecto, s.actividad_id, a.nombre AS actividad,
                       s.solicitado_por_usuario_id, u.username AS solicitante,
                       s.fecha_solicitud, s.fecha_requerida, s.estado, s.observaciones
                  FROM solicitudes_materiales s
                  JOIN proyectos p ON p.id = s.proyecto_id
                  LEFT JOIN actividades a ON a.id = s.actividad_id
                  JOIN usuarios u ON u.id = s.solicitado_por_usuario_id`

async function conDetalles(solicitudes) {
  if (solicitudes.length === 0) return solicitudes
  const [detalles] = await pool.query(
    `SELECT d.id, d.solicitud_id, d.material_id, m.codigo AS material_codigo, m.descripcion AS material,
            m.unidad_medida, m.existencia_total, d.cantidad_solicitada, d.cantidad_aprobada, d.cantidad_despachada
       FROM detalles_solicitud_materiales d JOIN materiales m ON m.id = d.material_id
      WHERE d.solicitud_id IN (?) ORDER BY d.id`,
    [solicitudes.map((s) => s.id)],
  )
  return solicitudes.map((s) => ({ ...s, detalles: detalles.filter((d) => d.solicitud_id === s.id) }))
}

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE s.id = ? AND s.activo = 1 LIMIT 1`, [id])
  return (await conDetalles(rows))[0] || null
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
  return conDetalles(rows)
}

/** Datos de la actividad y su proyecto (para validar que pertenece al proyecto indicado). */
export async function findActividadProyecto(actividadId) {
  const [rows] = await pool.query(
    `SELECT a.id, a.estado, e.proyecto_id FROM actividades a JOIN etapas_proyecto e ON e.id = a.etapa_id
      WHERE a.id = ? AND a.activo = 1 LIMIT 1`,
    [actividadId],
  )
  return rows[0] || null
}

export async function findMateriales(ids) {
  const [rows] = await pool.query('SELECT id, activo, descripcion FROM materiales WHERE id IN (?)', [ids])
  return rows
}

/** Crea la solicitud con sus líneas y la alerta para bodega, en una transacción. */
export async function crear({ proyectoId, actividadId, usuarioId, fechaRequerida, observaciones, detalles }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const temporal = `TMP-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    const [ins] = await conn.query(
      `INSERT INTO solicitudes_materiales (codigo, proyecto_id, actividad_id, solicitado_por_usuario_id, fecha_requerida, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [temporal, proyectoId, actividadId, usuarioId, fechaRequerida, observaciones],
    )
    const codigo = `SM-${String(ins.insertId).padStart(5, '0')}`
    await conn.query('UPDATE solicitudes_materiales SET codigo = ? WHERE id = ?', [codigo, ins.insertId])
    for (const d of detalles) {
      await conn.query(
        'INSERT INTO detalles_solicitud_materiales (solicitud_id, material_id, cantidad_solicitada) VALUES (?, ?, ?)',
        [ins.insertId, d.material_id, d.cantidad],
      )
    }
    // Aviso a bodega en el momento en que se genera la solicitud.
    await conn.query(
      `INSERT INTO alertas (tipo, titulo, descripcion, referencia_id, tabla_referencia)
       VALUES ('SOLICITUD_MATERIAL', ?, ?, ?, 'solicitudes_materiales')`,
      [`Nueva solicitud de materiales ${codigo}`, `Se solicitaron ${detalles.length} material(es) para revisión de bodega.`, ins.insertId],
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

/** Cambia el estado solo si sigue en uno de los estados esperados (evita doble resolución). */
export async function cambiarEstado(id, desde, hacia, observaciones = null, conn = pool) {
  const [r] = await conn.query(
    `UPDATE solicitudes_materiales SET estado = ?, observaciones = COALESCE(?, observaciones)
      WHERE id = ? AND estado IN (?)`,
    [hacia, observaciones, id, desde],
  )
  return r.affectedRows > 0
}

/** Fija la cantidad aprobada por línea y pasa la solicitud a APROBADA. */
export async function aprobar(id, aprobadas, observaciones) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (!(await cambiarEstado(id, ['PENDIENTE'], 'APROBADA', observaciones, conn))) {
      throw Object.assign(new Error('estado'), { codigo: 'ESTADO' })
    }
    for (const a of aprobadas) {
      await conn.query(
        'UPDATE detalles_solicitud_materiales SET cantidad_aprobada = ? WHERE id = ? AND solicitud_id = ?',
        [a.cantidad, a.detalle_id, id],
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/**
 * Despacha lo aprobado: crea la salida de materiales (los triggers descuentan la
 * existencia y alertan el stock mínimo), suma lo despachado por línea y deja la
 * solicitud en DESPACHADA_PARCIAL o DESPACHADA_TOTAL. `validar` revisa con las
 * líneas y existencias bloqueadas y devuelve las salidas a registrar.
 */
export async function despachar({ id, almacenId, trabajadorId, usuarioId, observaciones, validar }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[sol]] = await conn.query('SELECT * FROM solicitudes_materiales WHERE id = ? AND activo = 1 FOR UPDATE', [id])
    const [lineas] = sol
      ? await conn.query(
        `SELECT d.*, m.existencia_total, m.costo_referencia FROM detalles_solicitud_materiales d
           JOIN materiales m ON m.id = d.material_id WHERE d.solicitud_id = ? FOR UPDATE`, [id])
      : [[]]
    const salidas = validar(sol, lineas)
    const [ins] = await conn.query(
      `INSERT INTO salidas_materiales (almacen_origen_id, proyecto_id, actividad_id, entregado_a_trabajador_id, despachado_por_usuario_id, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [almacenId, sol.proyecto_id, sol.actividad_id, trabajadorId, usuarioId, observaciones],
    )
    for (const s of salidas) {
      await conn.query(
        'INSERT INTO detalles_salida_materiales (salida_id, material_id, cantidad_despachada, costo_unitario_momento) VALUES (?, ?, ?, ?)',
        [ins.insertId, s.material_id, s.cantidad, s.costo],
      )
      await conn.query('UPDATE detalles_solicitud_materiales SET cantidad_despachada = cantidad_despachada + ? WHERE id = ?', [s.cantidad, s.detalle_id])
    }
    const [[pend]] = await conn.query(
      'SELECT COUNT(*) AS n FROM detalles_solicitud_materiales WHERE solicitud_id = ? AND cantidad_despachada < cantidad_aprobada',
      [id],
    )
    await conn.query('UPDATE solicitudes_materiales SET estado = ? WHERE id = ?', [Number(pend.n) === 0 ? 'DESPACHADA_TOTAL' : 'DESPACHADA_PARCIAL', id])
    await conn.commit()
    return ins.insertId
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
