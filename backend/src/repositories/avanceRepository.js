import { pool } from '../db/pool.js'

/**
 * Repositorio del seguimiento de avance (HU-21): tabla `seguimiento_avance` y
 * el recálculo del avance de la etapa y del proyecto.
 */

// Promedio ponderado por `peso` de las actividades activas (HU-21 · criterio 4).
const PROMEDIO_PONDERADO = `COALESCE(ROUND(SUM(a.peso * a.porcentaje_avance) / NULLIF(SUM(a.peso), 0), 2), 0)`

export async function avanceDeEtapa(conn, etapaId) {
  const [rows] = await conn.query(
    `SELECT ${PROMEDIO_PONDERADO} AS avance FROM actividades a WHERE a.etapa_id = ? AND a.activo = 1`,
    [etapaId],
  )
  return Number(rows[0].avance)
}

export async function avanceDeProyecto(conn, proyectoId) {
  const [rows] = await conn.query(
    `SELECT ${PROMEDIO_PONDERADO} AS avance
       FROM actividades a JOIN etapas_proyecto e ON e.id = a.etapa_id
      WHERE e.proyecto_id = ? AND a.activo = 1 AND e.activo = 1`,
    [proyectoId],
  )
  return Number(rows[0].avance)
}

/**
 * Recalcula y guarda `proyectos.porcentaje_avance_total` (HU-21 · criterio 4).
 * Se usa cuando cambia la composición del plan sin registrar avance: una
 * actividad nueva, un peso editado o una actividad o etapa dada de baja o
 * reactivada. Devuelve el avance guardado.
 */
export async function recalcularAvanceProyecto(proyectoId, conn = pool) {
  const avance = await avanceDeProyecto(conn, proyectoId)
  await conn.query('UPDATE proyectos SET porcentaje_avance_total = ? WHERE id = ?', [avance, proyectoId])
  return avance
}

/**
 * Registra un avance de forma atómica: bloquea la actividad, inserta el
 * seguimiento con el porcentaje anterior y el nuevo, actualiza la actividad y
 * recalcula el avance del proyecto. `decidir(actividad)` corre con la fila ya
 * bloqueada (para que dos registros simultáneos no lean el mismo «anterior») y
 * devuelve `{ porcentaje, observaciones, usuarioId }` o lanza el error de negocio.
 */
export async function registrarAvance(actividadId, decidir) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [filas] = await conn.query(
      `SELECT a.id, a.etapa_id, a.nombre, a.estado, a.activo, a.porcentaje_avance,
              a.fecha_inicio_real, e.proyecto_id
         FROM actividades a JOIN etapas_proyecto e ON e.id = a.etapa_id
        WHERE a.id = ? FOR UPDATE`,
      [actividadId],
    )
    const actividad = filas[0]
    if (!actividad) {
      await conn.rollback()
      return null
    }

    const anterior = Number(actividad.porcentaje_avance)
    const { porcentaje, observaciones, usuarioId } = await decidir({ ...actividad, anterior })
    const completa = porcentaje === 100

    const [ins] = await conn.query(
      `INSERT INTO seguimiento_avance
         (actividad_id, registrado_por_usuario_id, porcentaje_anterior, porcentaje_nuevo, observaciones)
       VALUES (?, ?, ?, ?, ?)`,
      [actividadId, usuarioId, anterior, porcentaje, observaciones],
    )

    // HU-21 · criterio 3: al llegar al 100 % la actividad queda completada.
    await conn.query(
      completa
        ? `UPDATE actividades
              SET porcentaje_avance = ?, estado = 'COMPLETADA', fecha_fin_real = CURDATE()
            WHERE id = ?`
        : 'UPDATE actividades SET porcentaje_avance = ? WHERE id = ?',
      [porcentaje, actividadId],
    )

    const avanceEtapa = await avanceDeEtapa(conn, actividad.etapa_id)
    const avanceProyecto = await recalcularAvanceProyecto(actividad.proyecto_id, conn)

    await conn.commit()
    return {
      seguimiento_id: ins.insertId,
      actividad_id: Number(actividadId),
      etapa_id: actividad.etapa_id,
      proyecto_id: actividad.proyecto_id,
      porcentaje_anterior: anterior,
      porcentaje_nuevo: porcentaje,
      estado: completa ? 'COMPLETADA' : actividad.estado,
      avance_etapa: avanceEtapa,
      avance_proyecto: avanceProyecto,
    }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/** Historial de avance de una actividad, del más reciente al más antiguo. */
export async function listarPorActividad(actividadId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.actividad_id, s.registrado_por_usuario_id, u.username AS registrado_por,
            s.fecha_registro, s.porcentaje_anterior, s.porcentaje_nuevo, s.observaciones
       FROM seguimiento_avance s
       JOIN usuarios u ON u.id = s.registrado_por_usuario_id
      WHERE s.actividad_id = ?
      ORDER BY s.fecha_registro DESC, s.id DESC`,
    [actividadId],
  )
  return rows.map((r) => ({
    ...r,
    porcentaje_anterior: Number(r.porcentaje_anterior),
    porcentaje_nuevo: Number(r.porcentaje_nuevo),
  }))
}
