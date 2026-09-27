import { pool } from '../db/pool.js'
import { Etapa } from '../entities/Etapa.js'

/**
 * Repositorio de la tabla `etapas_proyecto` (HU-03).
 */

const CAMPOS = `id, proyecto_id, nombre, descripcion, orden,
                fecha_inicio_programada, fecha_fin_programada, estado, activo`

export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM etapas_proyecto WHERE id = ? LIMIT 1`,
    [id],
  )
  return Etapa.fromRow(rows[0])
}

/**
 * Lista las etapas del plan de trabajo. `incluirInactivos` incluye las dadas
 * de baja (HU-18); por defecto solo activas. Ordenadas por `orden`.
 */
export async function listarPorProyecto(proyectoId, incluirInactivos = false) {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS} FROM etapas_proyecto
     WHERE proyecto_id = ? ${incluirInactivos ? '' : 'AND activo = 1'}
     ORDER BY orden, id`,
    [proyectoId],
  )
  return rows.map(Etapa.fromRow)
}

/** Mayor `orden` registrado en un proyecto, para sugerir el siguiente. */
export async function maxOrden(proyectoId) {
  const [rows] = await pool.query(
    'SELECT COALESCE(MAX(orden), 0) AS maximo FROM etapas_proyecto WHERE proyecto_id = ?',
    [proyectoId],
  )
  return Number(rows[0]?.maximo ?? 0)
}

export async function create(etapa) {
  const [result] = await pool.query(
    `INSERT INTO etapas_proyecto
       (proyecto_id, nombre, descripcion, orden,
        fecha_inicio_programada, fecha_fin_programada, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      etapa.proyecto_id, etapa.nombre, etapa.descripcion, etapa.orden,
      etapa.fecha_inicio_programada, etapa.fecha_fin_programada, etapa.estado,
    ],
  )
  return result.insertId
}
