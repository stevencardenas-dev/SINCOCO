import { pool } from '../db/pool.js'

/** Repositorio de la tabla `alertas` (HU-23: stock mínimo; también guarda otros tipos). */

const SELECT = `SELECT a.id, a.tipo, a.titulo, a.descripcion, a.referencia_id, a.tabla_referencia,
                       a.fecha_generacion, a.atendida, a.fecha_atencion,
                       m.codigo AS material_codigo, m.existencia_total, m.nivel_minimo, m.unidad_medida
                  FROM alertas a
                  LEFT JOIN materiales m ON a.tabla_referencia = 'materiales' AND m.id = a.referencia_id`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE a.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function listar({ tipo = '', atendida = null } = {}) {
  const condiciones = []
  const params = []
  if (tipo) { condiciones.push('a.tipo = ?'); params.push(tipo) }
  if (atendida !== null) { condiciones.push('a.atendida = ?'); params.push(atendida ? 1 : 0) }
  const [rows] = await pool.query(
    `${SELECT} ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
      ORDER BY a.atendida ASC, a.fecha_generacion DESC, a.id DESC`,
    params,
  )
  return rows
}

/** Marca la alerta como atendida solo si seguía pendiente. */
export async function atender(id) {
  const [r] = await pool.query('UPDATE alertas SET atendida = 1, fecha_atencion = NOW() WHERE id = ? AND atendida = 0', [id])
  return r.affectedRows > 0
}

/**
 * Evalúa el stock de un material y genera la alerta STOCK_MINIMO si la existencia
 * es igual o inferior al nivel mínimo, sin duplicar una pendiente. Devuelve true si
 * creó una. Lo usan los procesos que cambian la existencia o el nivel mínimo
 * desde la aplicación (las salidas lo hacen con su trigger).
 */
export async function evaluarStockMinimo(materialId, conn = pool) {
  const [r] = await conn.query(
    `INSERT INTO alertas (tipo, titulo, descripcion, referencia_id, tabla_referencia)
     SELECT 'STOCK_MINIMO', CONCAT('Stock Crítico: ', m.descripcion),
            CONCAT('El material ', m.descripcion, ' ha llegado a ', m.existencia_total,
                   ' unidades (Mínimo configurado: ', m.nivel_minimo, ').'),
            m.id, 'materiales'
       FROM materiales m
      WHERE m.id = ? AND m.activo = 1 AND m.nivel_minimo > 0 AND m.existencia_total <= m.nivel_minimo
        AND NOT EXISTS (SELECT 1 FROM alertas a WHERE a.tipo = 'STOCK_MINIMO' AND a.referencia_id = m.id AND a.atendida = 0)`,
    [materialId],
  )
  return r.affectedRows > 0
}
