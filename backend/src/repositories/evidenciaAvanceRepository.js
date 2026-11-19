import { pool } from '../db/pool.js'

/**
 * Repositorio de las evidencias de avance (HU-22).
 *
 * La evidencia cuelga del corte de avance (`seguimiento_avance`), así que una
 * actividad acumula las evidencias de todos sus cortes.
 */

/** Último corte de avance de la actividad (donde se cuelga la evidencia nueva). */
export async function ultimoSeguimiento(actividadId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.actividad_id, s.fecha_registro, a.nombre AS actividad_nombre, a.proyecto_id
       FROM seguimiento_avance s
       JOIN actividades a ON a.id = s.actividad_id
      WHERE s.actividad_id = ?
      ORDER BY s.id DESC
      LIMIT 1`,
    [actividadId],
  )
  return rows[0] ?? null
}

export async function crear(datos) {
  const [r] = await pool.query(
    `INSERT INTO evidencias_avance
       (seguimiento_id, nombre_archivo, ruta_archivo, tipo_archivo, categoria, archivo, tamano_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.seguimiento_id,
      datos.nombre_archivo,
      datos.ruta_archivo,
      datos.tipo_archivo,
      datos.categoria ?? null,
      datos.archivo ?? null,
      datos.tamano_bytes ?? null,
    ],
  )
  return r.insertId
}

export async function actualizarRuta(id, ruta) {
  await pool.query('UPDATE evidencias_avance SET ruta_archivo = ? WHERE id = ?', [ruta, id])
}

const CAMPOS = `e.id, e.seguimiento_id, e.nombre_archivo, e.ruta_archivo, e.tipo_archivo,
                e.categoria, e.tamano_bytes, e.subido_en`

export async function listarPorActividad(actividadId) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS}, s.fecha_registro, s.porcentaje_nuevo, u.username AS subido_por
       FROM evidencias_avance e
       JOIN seguimiento_avance s ON s.id = e.seguimiento_id
       JOIN usuarios u ON u.id = s.registrado_por_usuario_id
      WHERE s.actividad_id = ?
      ORDER BY e.subido_en DESC, e.id DESC`,
    [actividadId],
  )
  return rows
}

/** Evidencias más recientes de todos los proyectos (tarjeta del dashboard). */
export async function recientes(limite = 6) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS}, s.fecha_registro, s.porcentaje_nuevo,
            a.nombre AS actividad_nombre, p.nombre AS proyecto_nombre, p.id AS proyecto_id,
            u.username AS subido_por
       FROM evidencias_avance e
       JOIN seguimiento_avance s ON s.id = e.seguimiento_id
       JOIN actividades a ON a.id = s.actividad_id
       JOIN proyectos p ON p.id = a.proyecto_id
       JOIN usuarios u ON u.id = s.registrado_por_usuario_id
      ORDER BY e.subido_en DESC, e.id DESC
      LIMIT ?`,
    [Number(limite)],
  )
  return rows
}

export async function obtener(id) {
  const [rows] = await pool.query(
    `SELECT e.id, e.nombre_archivo, e.tipo_archivo, e.archivo, e.tamano_bytes,
            s.actividad_id, a.proyecto_id
       FROM evidencias_avance e
       JOIN seguimiento_avance s ON s.id = e.seguimiento_id
       JOIN actividades a ON a.id = s.actividad_id
      WHERE e.id = ?
      LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

export async function eliminar(id) {
  const [r] = await pool.query('DELETE FROM evidencias_avance WHERE id = ?', [id])
  return r.affectedRows
}
