import { pool } from '../db/pool.js'

/**
 * Repositorio de `asignaciones_personal` (gestión de acceso a proyectos y
 * actividades).
 *
 * Una asignación vincula a un trabajador con un proyecto y, si se indica, con
 * una actividad concreta. Mientras está ACTIVA le da acceso al proyecto; al
 * pasar a FINALIZADO o REASIGNADO deja de darlo, pero se conserva como
 * historial (no se borra nada).
 */
const SELECT_BASE = `
  SELECT a.id, a.trabajador_id, a.proyecto_id, a.actividad_id,
         a.fecha_inicio, a.fecha_fin_programada, a.fecha_fin_real,
         a.rol_en_proyecto, a.estado, a.observaciones,
         TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS trabajador_nombre,
         t.numero_documento, c.nombre AS cargo,
         act.nombre AS actividad_nombre,
         p.nombre AS proyecto_nombre, p.codigo AS proyecto_codigo
    FROM asignaciones_personal a
    JOIN trabajadores t ON t.id = a.trabajador_id
    JOIN proyectos p ON p.id = a.proyecto_id
    LEFT JOIN cargos c ON c.id = t.cargo_id
    LEFT JOIN actividades act ON act.id = a.actividad_id
`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE a.id = ? LIMIT 1`, [id])
  return rows[0] ?? null
}

/** Lista asignaciones por proyecto y/o trabajador; activas primero. */
export async function listar({ proyectoId = null, trabajadorId = null } = {}) {
  const condiciones = []
  const params = []
  if (proyectoId) {
    condiciones.push('a.proyecto_id = ?')
    params.push(proyectoId)
  }
  if (trabajadorId) {
    condiciones.push('a.trabajador_id = ?')
    params.push(trabajadorId)
  }

  const [rows] = await pool.query(
    `${SELECT_BASE}
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY (a.estado = 'ACTIVO') DESC, a.fecha_inicio DESC, a.id DESC`,
    params,
  )
  return rows
}

/** ¿Ya existe una asignación activa para ese trabajador en ese destino? */
export async function existeActiva(trabajadorId, proyectoId, actividadId) {
  const [rows] = await pool.query(
    `SELECT id FROM asignaciones_personal
      WHERE trabajador_id = ? AND proyecto_id = ? AND estado = 'ACTIVO'
        AND ${actividadId ? 'actividad_id = ?' : 'actividad_id IS NULL'}
      LIMIT 1`,
    actividadId ? [trabajadorId, proyectoId, actividadId] : [trabajadorId, proyectoId],
  )
  return rows[0] ?? null
}

export async function create(asignacion) {
  const [result] = await pool.query(
    `INSERT INTO asignaciones_personal
       (trabajador_id, proyecto_id, actividad_id, fecha_inicio,
        fecha_fin_programada, rol_en_proyecto, estado, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      asignacion.trabajador_id,
      asignacion.proyecto_id,
      asignacion.actividad_id,
      asignacion.fecha_inicio,
      asignacion.fecha_fin_programada,
      asignacion.rol_en_proyecto,
      asignacion.estado,
      asignacion.observaciones,
    ],
  )
  return result.insertId
}

export async function update(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
  await pool.query(
    `UPDATE asignaciones_personal SET ${asignaciones.join(', ')} WHERE id = ?`,
    [...Object.values(campos), id],
  )
}

/**
 * ¿El trabajador tiene acceso vigente al proyecto?
 *
 * Vale la asignación directa al proyecto y la asignación a una de sus
 * actividades; también cuenta ser el responsable del proyecto. Los proyectos
 * dados de baja no se consultan por esta vía.
 */
export async function tieneAcceso(proyectoId, trabajadorId) {
  if (!trabajadorId) return false
  const [rows] = await pool.query(
    `SELECT 1
       FROM proyectos p
      WHERE p.id = ? AND p.activo = 1
        AND (
          p.responsable_id = ?
          OR EXISTS (
            SELECT 1
              FROM asignaciones_personal ap
              LEFT JOIN actividades ac ON ac.id = ap.actividad_id
              LEFT JOIN etapas_proyecto ep ON ep.id = ac.etapa_id
             WHERE ap.trabajador_id = ? AND ap.estado = 'ACTIVO'
               AND (ap.proyecto_id = p.id OR ep.proyecto_id = p.id)
          )
        )
      LIMIT 1`,
    [proyectoId, trabajadorId, trabajadorId],
  )
  return rows.length > 0
}

/** Actividades activas del proyecto en las que el trabajador interviene (asignación vigente o responsable). */
export async function actividadesDeTrabajador(proyectoId, trabajadorId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT ac.id
       FROM actividades ac
       JOIN etapas_proyecto ep ON ep.id = ac.etapa_id
      WHERE ep.proyecto_id = ? AND ac.activo = 1
        AND (
          ac.responsable_id = ?
          OR EXISTS (
            SELECT 1 FROM asignaciones_personal ap
             WHERE ap.actividad_id = ac.id AND ap.trabajador_id = ? AND ap.estado = 'ACTIVO'
          )
        )`,
    [proyectoId, trabajadorId, trabajadorId],
  )
  return rows.map((r) => Number(r.id))
}

/** Proyectos con acceso vigente para el trabajador (para el alcance limitado). */
export async function proyectosAccesibles(trabajadorId) {
  if (!trabajadorId) return []
  const [rows] = await pool.query(
    `SELECT DISTINCT p.id
       FROM proyectos p
       LEFT JOIN asignaciones_personal ap ON ap.trabajador_id = ? AND ap.estado = 'ACTIVO'
       LEFT JOIN actividades ac ON ac.id = ap.actividad_id
       LEFT JOIN etapas_proyecto ep ON ep.id = ac.etapa_id
      WHERE p.activo = 1
        AND (p.responsable_id = ? OR ap.proyecto_id = p.id OR ep.proyecto_id = p.id)`,
    [trabajadorId, trabajadorId],
  )
  return rows.map((r) => Number(r.id))
}
