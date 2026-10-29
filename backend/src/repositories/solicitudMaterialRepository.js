import { pool } from '../db/pool.js'
import { existenciaEnAlmacen } from './existenciaAlmacenRepository.js'

/** Repositorio de `solicitudes_materiales` y `detalles_solicitud_materiales` (HU-08). */

const SELECT = `SELECT s.id, s.codigo, s.proyecto_id, p.nombre AS proyecto, s.actividad_id, a.nombre AS actividad,
                       s.solicitado_por_usuario_id, u.username AS solicitante,
                       s.fecha_solicitud, s.fecha_requerida, s.estado, s.observaciones, s.excede_presupuesto,
                       s.saldo_cancelado, s.saldo_cancelado_observacion, s.saldo_cancelado_en
                  FROM solicitudes_materiales s
                  JOIN proyectos p ON p.id = s.proyecto_id
                  LEFT JOIN actividades a ON a.id = s.actividad_id
                  JOIN usuarios u ON u.id = s.solicitado_por_usuario_id`

async function conDetalles(solicitudes) {
  if (solicitudes.length === 0) return solicitudes
  const [detalles] = await pool.query(
    `SELECT d.id, d.solicitud_id, d.material_id, m.codigo AS material_codigo, m.descripcion AS material,
            m.unidad_medida, m.existencia_total, d.cantidad_solicitada, d.cantidad_aprobada, d.cantidad_despachada,
            d.observacion_aprobacion
       FROM detalles_solicitud_materiales d JOIN materiales m ON m.id = d.material_id
      WHERE d.solicitud_id IN (?) ORDER BY d.id`,
    [solicitudes.map((s) => s.id)],
  )
  return solicitudes.map((s) => ({
    ...s,
    // HU-36: saldo pendiente = lo solicitado que aún no se despachó (cero si el saldo se canceló).
    detalles: detalles.filter((d) => d.solicitud_id === s.id).map((d) => ({
      ...d,
      saldo_pendiente: s.saldo_cancelado ? 0 : Math.max(0, Math.round((Number(d.cantidad_solicitada) - Number(d.cantidad_despachada)) * 100) / 100),
    })),
  }))
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

/** Catálogo mínimo para el selector del formulario: no expone existencias ni costos. */
export async function catalogoMateriales() {
  const [rows] = await pool.query(
    'SELECT id, codigo, descripcion, unidad_medida FROM materiales WHERE activo = 1 ORDER BY codigo',
  )
  return rows
}

/** Cantidad presupuestada por material para la actividad (solo los materiales presupuestados). */
export async function presupuestoActividad(actividadId) {
  const [rows] = await pool.query(
    'SELECT material_id, cantidad_presupuestada FROM presupuesto_materiales_actividad WHERE actividad_id = ?',
    [actividadId],
  )
  return rows
}

/** Lo ya pedido por material para la actividad en solicitudes vigentes (no rechazadas ni canceladas). */
export async function yaSolicitadoActividad(actividadId, materialIds) {
  const [rows] = await pool.query(
    `SELECT d.material_id, SUM(d.cantidad_solicitada) AS cantidad
       FROM detalles_solicitud_materiales d JOIN solicitudes_materiales s ON s.id = d.solicitud_id
      WHERE s.actividad_id = ? AND s.activo = 1 AND s.estado NOT IN ('RECHAZADA', 'CANCELADA') AND d.material_id IN (?)
      GROUP BY d.material_id`,
    [actividadId, materialIds],
  )
  return rows
}

export async function findMateriales(ids) {
  const [rows] = await pool.query('SELECT id, activo, descripcion FROM materiales WHERE id IN (?)', [ids])
  return rows
}

/** Crea la solicitud con sus líneas y la alerta para bodega, en una transacción. */
export async function crear({ proyectoId, actividadId, usuarioId, fechaRequerida, observaciones, detalles, excedePresupuesto = false }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const temporal = `TMP-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    const [ins] = await conn.query(
      `INSERT INTO solicitudes_materiales (codigo, proyecto_id, actividad_id, solicitado_por_usuario_id, fecha_requerida, observaciones, excede_presupuesto)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [temporal, proyectoId, actividadId, usuarioId, fechaRequerida, observaciones, excedePresupuesto ? 1 : 0],
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
      [
        `Nueva solicitud de materiales ${codigo}${excedePresupuesto ? ' (excede lo presupuestado)' : ''}`,
        `Se solicitaron ${detalles.length} material(es) para revisión de bodega.${excedePresupuesto ? ' La cantidad supera lo presupuestado para la actividad y el solicitante lo confirmó.' : ''}`,
        ins.insertId,
      ],
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

/** Aviso dirigido a un usuario (p. ej. al solicitante cuando bodega resuelve su solicitud). */
export async function crearNotificacion({ usuarioId, titulo, mensaje, referenciaId = null }, conn = pool) {
  await conn.query(
    `INSERT INTO notificaciones (usuario_id, titulo, mensaje, referencia_id, tabla_referencia)
     VALUES (?, ?, ?, ?, 'solicitudes_materiales')`,
    [usuarioId, titulo, mensaje, referenciaId],
  )
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

/**
 * Fija la cantidad aprobada (y su observación) por línea y pasa la solicitud a `estadoNuevo`: APROBADA si se
 * aprobó todo lo solicitado, APROBADA_PARCIAL si alguna línea quedó por debajo (HU-36: el resto es saldo pendiente).
 */
export async function aprobar(id, aprobadas, observaciones, notificacion = null, estadoNuevo = 'APROBADA') {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (!(await cambiarEstado(id, ['PENDIENTE'], estadoNuevo, observaciones, conn))) {
      throw Object.assign(new Error('estado'), { codigo: 'ESTADO' })
    }
    for (const a of aprobadas) {
      await conn.query(
        'UPDATE detalles_solicitud_materiales SET cantidad_aprobada = ?, observacion_aprobacion = ? WHERE id = ? AND solicitud_id = ?',
        [a.cantidad, a.observacion ?? null, a.detalle_id, id],
      )
    }
    if (notificacion) await crearNotificacion(notificacion, conn)
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
        `SELECT d.*, m.descripcion AS material, m.existencia_total, m.costo_referencia FROM detalles_solicitud_materiales d
           JOIN materiales m ON m.id = d.material_id WHERE d.solicitud_id = ? FOR UPDATE`, [id])
      : [[]]
    // HU-26: la existencia que cuenta es la del almacén de origen (el material ya está bloqueado por la consulta anterior).
    for (const l of lineas) l.existencia_almacen = await existenciaEnAlmacen(almacenId, l.material_id, conn)
    const salidas = validar(sol, lineas)
    const [ins] = await conn.query(
      `INSERT INTO salidas_materiales (almacen_origen_id, proyecto_id, solicitud_id, actividad_id, entregado_a_trabajador_id, despachado_por_usuario_id, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [almacenId, sol.proyecto_id, sol.id, sol.actividad_id, trabajadorId, usuarioId, observaciones],
    )
    for (const s of salidas) {
      await conn.query(
        'INSERT INTO detalles_salida_materiales (salida_id, material_id, cantidad_despachada, costo_unitario_momento) VALUES (?, ?, ?, ?)',
        [ins.insertId, s.material_id, s.cantidad, s.costo],
      )
      // HU-36: despachar parte del saldo también lo aprueba (la aprobación nunca queda por debajo de lo despachado).
      await conn.query(
        `UPDATE detalles_solicitud_materiales
            SET cantidad_despachada = cantidad_despachada + ?, cantidad_aprobada = GREATEST(cantidad_aprobada, cantidad_despachada)
          WHERE id = ?`,
        [s.cantidad, s.detalle_id],
      )
    }
    // La solicitud solo queda despachada cuando el saldo (solicitado - despachado) llega a cero.
    const [[pend]] = await conn.query(
      'SELECT COUNT(*) AS n FROM detalles_solicitud_materiales WHERE solicitud_id = ? AND cantidad_despachada < cantidad_solicitada',
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

/**
 * HU-36: cancela el saldo pendiente con una observación. Si ya se despachó algo, la solicitud se cierra con lo
 * despachado (DESPACHADA_TOTAL con `saldo_cancelado`); si no se despachó nada, queda CANCELADA. Devuelve el estado final,
 * o null si la solicitud ya no estaba en un estado que admita cancelar el saldo.
 */
export async function cancelarSaldo(id, usuarioId, observacion, notificacion = null) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[s]] = await conn.query('SELECT estado FROM solicitudes_materiales WHERE id = ? AND activo = 1 FOR UPDATE', [id])
    if (!s || !['APROBADA_PARCIAL', 'DESPACHADA_PARCIAL', 'APROBADA'].includes(s.estado)) { await conn.rollback(); return null }
    const [[d]] = await conn.query('SELECT COALESCE(SUM(cantidad_despachada), 0) AS despachado FROM detalles_solicitud_materiales WHERE solicitud_id = ?', [id])
    const final = Number(d.despachado) > 0 ? 'DESPACHADA_TOTAL' : 'CANCELADA'
    await conn.query(
      `UPDATE solicitudes_materiales
          SET estado = ?, saldo_cancelado = 1, saldo_cancelado_observacion = ?, saldo_cancelado_por_usuario_id = ?, saldo_cancelado_en = NOW()
        WHERE id = ?`,
      [final, observacion, usuarioId, id],
    )
    if (notificacion) await crearNotificacion(notificacion, conn)
    await conn.commit()
    return final
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
