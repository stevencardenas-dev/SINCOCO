import { pool } from '../db/pool.js'
import { ServicioExterno } from '../entities/ServicioExterno.js'

/** Repositorio de la tabla `servicios_externos` (HU-28). */

const SELECT_BASE = `
  SELECT s.id, s.proveedor_id, s.proyecto_id, s.actividad_id, s.nombre_servicio,
         s.descripcion, s.responsable_externo, s.fecha_inicio, s.fecha_fin,
         s.valor_contratado, s.estado, s.observaciones, s.creado_en,
         s.autorizacion_estado, s.exceso_presupuesto, s.autorizado_por_usuario_id,
         s.autorizado_en, s.observacion_autorizacion,
         ua.username AS autorizado_por,
         pv.razon_social AS proveedor_nombre,
         p.codigo AS proyecto_codigo, p.nombre AS proyecto_nombre,
         a.nombre AS actividad_nombre
  FROM servicios_externos s
  JOIN proveedores pv ON pv.id = s.proveedor_id
  JOIN proyectos p ON p.id = s.proyecto_id
  LEFT JOIN actividades a ON a.id = s.actividad_id
  LEFT JOIN usuarios ua ON ua.id = s.autorizado_por_usuario_id
`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE s.id = ? LIMIT 1`, [id])
  return ServicioExterno.fromRow(rows[0])
}

/** Servicios con filtros opcionales (proyecto, actividad, proveedor, estado), los más recientes primero. */
export async function listar({ proyectoId, actividadId, proveedorId, estado } = {}) {
  const condiciones = []
  const params = []
  for (const [columna, valor] of [
    ['proyecto_id', proyectoId], ['actividad_id', actividadId],
    ['proveedor_id', proveedorId], ['estado', estado],
  ]) {
    if (valor) {
      condiciones.push(`s.${columna} = ?`)
      params.push(valor)
    }
  }
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [rows] = await pool.query(
    `${SELECT_BASE} ${where} ORDER BY s.fecha_inicio DESC, s.id DESC`,
    params,
  )
  return rows.map(ServicioExterno.fromRow)
}

export async function create(s) {
  const [result] = await pool.query(
    `INSERT INTO servicios_externos
       (proveedor_id, proyecto_id, actividad_id, nombre_servicio, descripcion,
        responsable_externo, fecha_inicio, fecha_fin, valor_contratado, estado, observaciones,
        autorizacion_estado, exceso_presupuesto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.proveedor_id, s.proyecto_id, s.actividad_id, s.nombre_servicio, s.descripcion,
      s.responsable_externo, s.fecha_inicio, s.fecha_fin, s.valor_contratado, s.estado, s.observaciones,
      s.autorizacion_estado ?? 'NO_REQUIERE', s.exceso_presupuesto ?? 0,
    ],
  )
  return result.insertId
}

/**
 * Lo ya contratado en una actividad. Un servicio cancelado o rechazado libera su
 * presupuesto; uno pendiente de autorización lo sigue comprometiendo, para que
 * dos servicios pendientes no prometan el mismo dinero.
 * `excluirId` saca del total el servicio que se está reevaluando.
 */
export async function totalContratadoActividad(actividadId, excluirId = null) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(valor_contratado), 0) AS total
       FROM servicios_externos
      WHERE actividad_id = ? AND estado <> 'CANCELADO'
        AND autorizacion_estado <> 'RECHAZADA'
        ${excluirId ? 'AND id <> ?' : ''}`,
    excluirId ? [actividadId, excluirId] : [actividadId],
  )
  return Number(rows[0].total)
}

/** Registra la decisión del gerente sobre un servicio pendiente. */
export async function decidirAutorizacion(id, { estado, usuarioId, observacion = null, exceso = null }) {
  const [r] = await pool.query(
    `UPDATE servicios_externos
        SET autorizacion_estado = ?, autorizado_por_usuario_id = ?, autorizado_en = NOW(),
            observacion_autorizacion = ?, exceso_presupuesto = COALESCE(?, exceso_presupuesto)
      WHERE id = ? AND autorizacion_estado = 'PENDIENTE'`,
    [estado, usuarioId ?? null, observacion, exceso, id],
  )
  return r.affectedRows > 0
}

/** Guarda el nuevo monto de un servicio rechazado o pendiente y su nueva evaluación. */
export async function actualizarValor(id, { valorContratado, autorizacion, exceso }) {
  await pool.query(
    `UPDATE servicios_externos
        SET valor_contratado = ?, autorizacion_estado = ?, exceso_presupuesto = ?,
            autorizado_por_usuario_id = NULL, autorizado_en = NULL, observacion_autorizacion = NULL
      WHERE id = ?`,
    [valorContratado, autorizacion, exceso, id],
  )
}

/**
 * Aviso dirigido al gerente: la notificación queda en su bandeja y sigue el
 * servicio que la originó. Devuelve cuántos gerentes activos se notificaron.
 */
export async function notificarGerentes({ titulo, mensaje, servicioId }) {
  const [gerentes] = await pool.query(
    `SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE r.nombre = 'GERENTE' AND u.activo = 1 AND u.estado = 'ACTIVO'`,
  )
  for (const g of gerentes) {
    await pool.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, referencia_id, tabla_referencia)
       VALUES (?, ?, ?, ?, 'servicios_externos')`,
      [g.id, titulo, mensaje, servicioId],
    )
  }
  return gerentes.length
}
