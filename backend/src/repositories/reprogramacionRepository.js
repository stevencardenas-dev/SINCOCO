import { pool } from '../db/pool.js'

/**
 * Repositorio del historial de reprogramaciones (HU-34, tabla
 * `reprogramaciones_plan`) y de las escrituras de fechas que lo acompañan.
 *
 * Una reprogramación toca varias filas (el elemento, las etapas posteriores, el
 * fin del proyecto, el historial). Las funciones de escritura reciben la
 * conexión `conn` de la transacción abierta con `conTransaccion` para que todo
 * se guarde junto o no se guarde nada.
 */

/** Ejecuta `fn(conn)` dentro de una transacción: commit si termina, rollback si falla. */
export async function conTransaccion(fn) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const resultado = await fn(conn)
    await conn.commit()
    return resultado
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// Tablas cuyas fechas puede reprogramar este módulo (lista cerrada: el nombre
// de tabla se concatena en el SQL).
const TABLAS = {
  ETAPA: 'etapas_proyecto',
  ACTIVIDAD: 'actividades',
  PROYECTO: 'proyectos',
}

/**
 * HU-34 · criterio 1: escribe las fechas vigentes de un elemento. En la primera
 * reprogramación `fecha_*_original` toma la fecha programada actual; después
 * COALESCE la deja intacta (y el disparador de la base lo garantiza). MySQL
 * evalúa las asignaciones de izquierda a derecha, así que las columnas
 * originales deben ir antes que las programadas.
 */
export async function fijarFechas(conn, tipo, id, inicio, fin) {
  await conn.query(
    `UPDATE ${TABLAS[tipo]}
        SET fecha_inicio_original = COALESCE(fecha_inicio_original, fecha_inicio_programada),
            fecha_fin_original = COALESCE(fecha_fin_original, fecha_fin_programada),
            fecha_inicio_programada = ?, fecha_fin_programada = ?
      WHERE id = ?`,
    [inicio, fin, id],
  )
}

/** HU-34 · criterio 2: registra un cambio de fechas con su motivo y autor. */
export async function registrar(conn, cambio) {
  await conn.query(
    `INSERT INTO reprogramaciones_plan
       (proyecto_id, entidad_tipo, entidad_id, origen, motivo, usuario_id,
        fecha_inicio_anterior, fecha_fin_anterior, fecha_inicio_nueva, fecha_fin_nueva)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cambio.proyecto_id, cambio.entidad_tipo, cambio.entidad_id, cambio.origen ?? 'DIRECTA',
      cambio.motivo, cambio.usuario_id,
      cambio.fecha_inicio_anterior, cambio.fecha_fin_anterior,
      cambio.fecha_inicio_nueva, cambio.fecha_fin_nueva,
    ],
  )
}

const SELECT_HISTORIAL = `
  SELECT r.id, r.proyecto_id, r.entidad_tipo, r.entidad_id, r.origen, r.motivo,
         r.usuario_id, u.username AS usuario_nombre, r.fecha_registro,
         r.fecha_inicio_anterior, r.fecha_fin_anterior,
         r.fecha_inicio_nueva, r.fecha_fin_nueva
  FROM reprogramaciones_plan r
  JOIN usuarios u ON u.id = r.usuario_id
`

/** Historial de un elemento (etapa, actividad o proyecto), del más reciente al más antiguo. */
export async function listarPorEntidad(tipo, id) {
  const [rows] = await pool.query(
    `${SELECT_HISTORIAL} WHERE r.entidad_tipo = ? AND r.entidad_id = ? ORDER BY r.id DESC`,
    [tipo, id],
  )
  return rows
}
