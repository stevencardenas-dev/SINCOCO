import { pool } from '../db/pool.js'
import { Actividad } from '../entities/Actividad.js'

/**
 * Repositorio de la tabla `actividades` (HU-03).
 */

const SELECT_BASE = `
  SELECT a.id, a.etapa_id, a.responsable_id, a.nombre, a.descripcion,
         a.fecha_inicio_programada, a.fecha_fin_programada,
         a.fecha_inicio_real, a.fecha_fin_real, a.porcentaje_avance,
         a.estado, a.activo,
         e.nombre AS etapa_nombre, e.proyecto_id AS proyecto_id,
         TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS responsable_nombre
  FROM actividades a
  JOIN etapas_proyecto e ON e.id = a.etapa_id
  LEFT JOIN trabajadores t ON t.id = a.responsable_id
`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE a.id = ? LIMIT 1`, [id])
  return Actividad.fromRow(rows[0])
}

export async function listarPorEtapa(etapaId, incluirInactivos = false) {
  const [rows] = await pool.query(
    `${SELECT_BASE} WHERE a.etapa_id = ? ${incluirInactivos ? '' : 'AND a.activo = 1'}
     ORDER BY a.fecha_inicio_programada, a.id`,
    [etapaId],
  )
  return rows.map(Actividad.fromRow)
}

/** Lista todas las actividades de un proyecto (a través de sus etapas). */
export async function listarPorProyecto(proyectoId, incluirInactivos = false) {
  const [rows] = await pool.query(
    `${SELECT_BASE} WHERE e.proyecto_id = ? ${incluirInactivos ? '' : 'AND a.activo = 1'}
     ORDER BY e.orden, a.fecha_inicio_programada, a.id`,
    [proyectoId],
  )
  return rows.map(Actividad.fromRow)
}

export async function create(actividad) {
  const [result] = await pool.query(
    `INSERT INTO actividades
       (etapa_id, responsable_id, nombre, descripcion,
        fecha_inicio_programada, fecha_fin_programada, porcentaje_avance, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actividad.etapa_id, actividad.responsable_id, actividad.nombre,
      actividad.descripcion, actividad.fecha_inicio_programada,
      actividad.fecha_fin_programada, actividad.porcentaje_avance, actividad.estado,
    ],
  )
  return result.insertId
}

/** Actualización parcial: solo se escriben los campos recibidos. */
export async function update(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
  await pool.query(
    `UPDATE actividades SET ${asignaciones.join(', ')} WHERE id = ?`,
    [...Object.values(campos), id],
  )
}
