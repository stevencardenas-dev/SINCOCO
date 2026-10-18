import { pool } from '../db/pool.js'

/**
 * Repositorio de incidencias de obra (HU-14): tabla `incidencias` y la alerta
 * `INCIDENCIA_CRITICA` que se genera con las de severidad alta.
 */

const SELECT_BASE = `
  SELECT i.id, i.proyecto_id, p.nombre AS proyecto_nombre, i.actividad_id, a.nombre AS actividad_nombre,
         i.reportado_por_usuario_id, u.username AS reportado_por,
         i.tipo, i.titulo, i.descripcion, i.evidencia, i.evidencia_archivo, i.severidad, i.estado,
         i.fecha_incidencia, DATE_FORMAT(i.fecha_resolucion, '%Y-%m-%d') AS fecha_resolucion
    FROM incidencias i
    JOIN proyectos p ON p.id = i.proyecto_id
    JOIN usuarios u ON u.id = i.reportado_por_usuario_id
    LEFT JOIN actividades a ON a.id = i.actividad_id
`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE i.id = ? LIMIT 1`, [id])
  return rows[0] ?? null
}

/**
 * Lista incidencias, de la más grave y reciente a la más antigua. Si
 * `trabajadorId` viene, solo las de proyectos donde esa persona es responsable
 * o tiene una asignación vigente (mismo alcance que `tieneAcceso`).
 */
export async function listar({ proyectoId, actividadId, estado, severidad, trabajadorId, limitarAcceso } = {}) {
  const where = []
  const params = []
  if (proyectoId) { where.push('i.proyecto_id = ?'); params.push(proyectoId) }
  if (actividadId) { where.push('i.actividad_id = ?'); params.push(actividadId) }
  if (estado) { where.push('i.estado = ?'); params.push(estado) }
  if (severidad) { where.push('i.severidad = ?'); params.push(severidad) }
  if (limitarAcceso) {
    where.push(`(
      p.responsable_id = ?
      OR EXISTS (
        SELECT 1
          FROM asignaciones_personal ap
          LEFT JOIN actividades ac ON ac.id = ap.actividad_id
          LEFT JOIN etapas_proyecto ep ON ep.id = ac.etapa_id
         WHERE ap.trabajador_id = ? AND ap.estado = 'ACTIVO'
           AND (ap.proyecto_id = p.id OR ep.proyecto_id = p.id)
      ))`)
    params.push(trabajadorId ?? 0, trabajadorId ?? 0)
  }
  const [rows] = await pool.query(
    `${SELECT_BASE} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY FIELD(i.estado, 'ABIERTA', 'EN_REVISION', 'RESUELTA', 'CERRADA'),
               FIELD(i.severidad, 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'), i.fecha_incidencia DESC, i.id DESC`,
    params,
  )
  return rows
}

/**
 * Inserta la incidencia y, si `alerta` viene, su alerta en la misma
 * transacción: no puede quedar una incidencia grave sin su aviso.
 */
export async function crear(datos, alerta) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [ins] = await conn.query(
      `INSERT INTO incidencias
         (proyecto_id, actividad_id, reportado_por_usuario_id, tipo, titulo, descripcion, evidencia, evidencia_archivo, severidad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [datos.proyecto_id, datos.actividad_id, datos.usuarioId, datos.tipo, datos.titulo,
       datos.descripcion, datos.evidencia, datos.evidencia_archivo ?? null, datos.severidad],
    )
    if (alerta) {
      await conn.query(
        `INSERT INTO alertas (tipo, titulo, descripcion, referencia_id, tabla_referencia)
         VALUES ('INCIDENCIA_CRITICA', ?, ?, ?, 'incidencias')`,
        [alerta.titulo, alerta.descripcion, ins.insertId],
      )
    }
    await conn.commit()
    return ins.insertId
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function actualizar(id, campos) {
  const columnas = Object.keys(campos)
  await pool.query(
    `UPDATE incidencias SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...columnas.map((c) => campos[c]), id],
  )
}

/** Marca como atendida la alerta de una incidencia que ya se resolvió o cerró. */
export async function atenderAlerta(incidenciaId) {
  await pool.query(
    `UPDATE alertas SET atendida = 1, fecha_atencion = NOW()
      WHERE tabla_referencia = 'incidencias' AND referencia_id = ? AND atendida = 0`,
    [incidenciaId],
  )
}

/** Correo del responsable (líder) del proyecto: el de su cuenta o, si no, el de su ficha. */
export async function responsableDelProyecto(proyectoId) {
  const [rows] = await pool.query(
    `SELECT t.id AS trabajador_id, TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS nombre,
            COALESCE(u.email, t.email) AS email
       FROM proyectos p
       JOIN trabajadores t ON t.id = p.responsable_id
       LEFT JOIN usuarios u ON u.trabajador_id = t.id AND u.activo = 1
      WHERE p.id = ? LIMIT 1`,
    [proyectoId],
  )
  return rows[0] ?? null
}

/** Ids de actividad con incidencias ALTA/CRITICA sin resolver, para resaltarlas en el cronograma. */
export async function actividadesConIncidenciaGrave(proyectoId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT i.actividad_id
       FROM incidencias i
      WHERE i.proyecto_id = ? AND i.actividad_id IS NOT NULL
        AND i.severidad IN ('ALTA', 'CRITICA') AND i.estado IN ('ABIERTA', 'EN_REVISION')`,
    [proyectoId],
  )
  return rows.map((r) => Number(r.actividad_id))
}
