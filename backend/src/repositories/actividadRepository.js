import { pool } from '../db/pool.js'
import { Actividad } from '../entities/Actividad.js'

/**
 * Repositorio de la tabla `actividades` (HU-03).
 */

const SELECT_BASE = `
  SELECT a.id, a.etapa_id, a.responsable_id, a.nombre, a.descripcion,
         a.fecha_inicio_programada, a.fecha_fin_programada,
         a.fecha_inicio_original, a.fecha_fin_original,
         a.fecha_inicio_real, a.fecha_fin_real, a.porcentaje_avance, a.peso, a.esfuerzo,
         (SELECT COUNT(*) FROM criterios_aceptacion c WHERE c.actividad_id = a.id) AS total_criterios,
         (SELECT COUNT(*) FROM criterios_aceptacion c WHERE c.actividad_id = a.id AND c.cumplido = 1) AS criterios_cumplidos,
         a.estado, a.activo,
         e.nombre AS etapa_nombre, e.proyecto_id AS proyecto_id,
         TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS responsable_nombre,
         (a.estado IN ('PENDIENTE', 'EN_PROCESO') AND a.fecha_fin_programada < CURDATE()) AS atrasada
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

/** Crea la actividad junto con sus criterios de aceptación en una sola transacción. */
export async function create(actividad) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      `INSERT INTO actividades
         (etapa_id, responsable_id, nombre, descripcion,
          fecha_inicio_programada, fecha_fin_programada, porcentaje_avance, esfuerzo, peso, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actividad.etapa_id, actividad.responsable_id, actividad.nombre,
        actividad.descripcion, actividad.fecha_inicio_programada,
        actividad.fecha_fin_programada, actividad.porcentaje_avance,
        actividad.esfuerzo ?? 'MEDIO', actividad.peso ?? 3, actividad.estado,
      ],
    )
    const criterios = actividad.criterios ?? []
    if (criterios.length > 0) {
      await conn.query(
        'INSERT INTO criterios_aceptacion (actividad_id, descripcion, orden) VALUES ?',
        [criterios.map((d, i) => [result.insertId, d, i + 1])],
      )
    }
    await conn.commit()
    return result.insertId
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/** Criterios de aceptación de una actividad, en su orden. */
export async function listarCriterios(actividadId) {
  const [rows] = await pool.query(
    `SELECT id, actividad_id, descripcion, cumplido, orden
       FROM criterios_aceptacion WHERE actividad_id = ? ORDER BY orden, id`,
    [actividadId],
  )
  return rows.map((r) => ({ ...r, cumplido: Boolean(r.cumplido) }))
}

/** Actualización parcial: solo se escriben los campos recibidos. */
export async function update(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
  await pool.query(
    `UPDATE actividades SET ${asignaciones.join(', ')} WHERE id = ?`,
    [...Object.values(campos), id],
  )
}
