import { pool } from '../db/pool.js'

/**
 * Repositorio de `plantillas_etapas` y `plantillas_etapas_detalle` (mejora de HU-03).
 */

/** Plantillas activas con sus etapas ordenadas. */
export async function listarActivas() {
  const [plantillas] = await pool.query(
    'SELECT id, nombre, descripcion FROM plantillas_etapas WHERE activo = 1 ORDER BY id',
  )
  const [detalle] = await pool.query(
    `SELECT d.plantilla_id, d.orden, d.nombre, d.descripcion
       FROM plantillas_etapas_detalle d
       JOIN plantillas_etapas p ON p.id = d.plantilla_id AND p.activo = 1
      ORDER BY d.plantilla_id, d.orden`,
  )
  return plantillas.map((p) => ({
    ...p,
    etapas: detalle.filter((d) => d.plantilla_id === p.id).map(({ orden, nombre, descripcion }) => ({ orden, nombre, descripcion })),
  }))
}

export async function findActivaById(id) {
  return (await listarActivas()).find((p) => Number(p.id) === Number(id)) ?? null
}

/**
 * Inserta las etapas de la plantilla al final del proyecto, en una sola
 * transacción: o se crean todas o ninguna. Quedan PENDIENTE y sin fechas.
 * Devuelve los ids creados.
 */
export async function crearEtapasDePlantilla(proyectoId, etapas) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[{ maximo }]] = await conn.query(
      'SELECT COALESCE(MAX(orden), 0) AS maximo FROM etapas_proyecto WHERE proyecto_id = ? FOR UPDATE',
      [proyectoId],
    )
    const ids = []
    let orden = Number(maximo)
    for (const e of etapas) {
      orden += 1
      const [r] = await conn.query(
        `INSERT INTO etapas_proyecto (proyecto_id, nombre, descripcion, orden, estado)
         VALUES (?, ?, ?, ?, 'PENDIENTE')`,
        [proyectoId, e.nombre, e.descripcion ?? null, orden],
      )
      ids.push(r.insertId)
    }
    await conn.commit()
    return ids
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
