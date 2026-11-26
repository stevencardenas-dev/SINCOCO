import { pool } from '../db/pool.js'

/**
 * Repositorio de `consolidaciones_costo` (HU-15).
 *
 * El costo real de un proyecto se arma con las tres fuentes del criterio:
 * materiales despachados (cantidad × costo unitario del momento), servicios
 * externos contratados (valor_contratado) y órdenes de compra (monto_total),
 * sin contar las canceladas ni las dadas de baja.
 */

/** Suma de las tres fuentes para un proyecto. */
export async function costosDeProyecto(proyectoId) {
  const [[fila]] = await pool.query(
    `SELECT
       (SELECT COALESCE(SUM(d.cantidad_despachada * d.costo_unitario_momento), 0)
          FROM detalles_salida_materiales d
          JOIN salidas_materiales s ON s.id = d.salida_id
         WHERE s.proyecto_id = ?) AS materiales,
       (SELECT COALESCE(SUM(valor_contratado), 0)
          FROM servicios_externos
         WHERE proyecto_id = ? AND estado <> 'CANCELADO') AS servicios,
       (SELECT COALESCE(SUM(monto_total), 0)
          FROM ordenes_compra
         WHERE proyecto_id = ? AND activo = 1 AND estado <> 'CANCELADA') AS ordenes_compra`,
    [proyectoId, proyectoId, proyectoId],
  )
  return fila
}

/** Guarda un corte de consolidación y devuelve su id. */
export async function registrar(datos) {
  const [r] = await pool.query(
    `INSERT INTO consolidaciones_costo
       (proyecto_id, costo_materiales, costo_servicios, costo_ordenes_compra,
        costo_real, presupuesto_inicial, desviacion_porcentaje, consolidado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.proyecto_id,
      datos.costo_materiales,
      datos.costo_servicios,
      datos.costo_ordenes_compra,
      datos.costo_real,
      datos.presupuesto_inicial,
      datos.desviacion_porcentaje,
      datos.consolidado_por_usuario_id ?? null,
    ],
  )
  return r.insertId
}

/** Último corte guardado de un proyecto. */
export async function ultimaDeProyecto(proyectoId) {
  const [rows] = await pool.query(
    `SELECT c.*, u.username AS consolidado_por
       FROM consolidaciones_costo c
       LEFT JOIN usuarios u ON u.id = c.consolidado_por_usuario_id
      WHERE c.proyecto_id = ?
      ORDER BY c.consolidado_en DESC, c.id DESC
      LIMIT 1`,
    [proyectoId],
  )
  return rows[0] ?? null
}

/** Historial de cortes de un proyecto, del más reciente al más antiguo. */
export async function historialDeProyecto(proyectoId, limite = 12) {
  const [rows] = await pool.query(
    `SELECT c.*, u.username AS consolidado_por
       FROM consolidaciones_costo c
       LEFT JOIN usuarios u ON u.id = c.consolidado_por_usuario_id
      WHERE c.proyecto_id = ?
      ORDER BY c.consolidado_en DESC, c.id DESC
      LIMIT ?`,
    [proyectoId, Number(limite)],
  )
  return rows
}

/**
 * Un renglón por proyecto vigente con su presupuesto y el último corte
 * consolidado (si lo tiene). Es la lista que alimenta la pantalla de costos y
 * las desviaciones presupuestales (HU-39), que además filtran por proyecto y
 * por el alcance del usuario.
 */
export async function resumenPorProyecto({ estado = '', proyectoId = null, alcance = null } = {}) {
  const condiciones = ['p.activo = 1']
  const params = []
  if (estado) {
    condiciones.push('p.estado = ?')
    params.push(estado)
  }
  if (proyectoId) {
    condiciones.push('p.id = ?')
    params.push(proyectoId)
  }
  if (alcance && !alcance.total) {
    condiciones.push(`(p.responsable_id = ? OR EXISTS (
      SELECT 1 FROM asignaciones_personal ap
       WHERE ap.proyecto_id = p.id AND ap.trabajador_id = ? AND ap.estado = 'ACTIVO'))`)
    params.push(alcance.trabajadorId ?? 0, alcance.trabajadorId ?? 0)
  }
  const [rows] = await pool.query(
    `SELECT p.id, p.codigo, p.nombre, p.estado, p.presupuesto_inicial,
            p.porcentaje_avance_total,
            c.costo_materiales, c.costo_servicios, c.costo_ordenes_compra,
            c.costo_real, c.desviacion_porcentaje, c.consolidado_en,
            c.presupuesto_inicial AS presupuesto_consolidado
       FROM proyectos p
       LEFT JOIN consolidaciones_costo c
              ON c.id = (SELECT c2.id FROM consolidaciones_costo c2
                          WHERE c2.proyecto_id = p.id
                          ORDER BY c2.consolidado_en DESC, c2.id DESC
                          LIMIT 1)
      WHERE ${condiciones.join(' AND ')}
      ORDER BY p.codigo`,
    params,
  )
  return rows
}
