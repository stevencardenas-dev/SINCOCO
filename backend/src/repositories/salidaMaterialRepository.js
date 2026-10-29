import { pool } from '../db/pool.js'

/** Repositorio de consulta de `salidas_materiales` y sus detalles (HU-26). */

const SELECT = `SELECT s.id, CONCAT('SA-', LPAD(s.id, 5, '0')) AS comprobante, s.solicitud_id, sm.codigo AS solicitud,
                       s.almacen_origen_id, a.nombre AS almacen_origen, s.proyecto_id, p.nombre AS proyecto,
                       s.actividad_id, ac.nombre AS actividad,
                       s.entregado_a_trabajador_id, CONCAT(t.nombres, ' ', t.apellidos) AS entregado_a,
                       s.despachado_por_usuario_id, COALESCE(CONCAT(td.nombres, ' ', td.apellidos), u.username) AS despachado_por,
                       s.fecha_salida, s.observaciones
                  FROM salidas_materiales s
                  JOIN almacenes a ON a.id = s.almacen_origen_id
                  JOIN proyectos p ON p.id = s.proyecto_id
                  LEFT JOIN actividades ac ON ac.id = s.actividad_id
                  JOIN trabajadores t ON t.id = s.entregado_a_trabajador_id
                  JOIN usuarios u ON u.id = s.despachado_por_usuario_id
                  LEFT JOIN trabajadores td ON td.id = u.trabajador_id
                  LEFT JOIN solicitudes_materiales sm ON sm.id = s.solicitud_id`

async function conDetalles(salidas) {
  if (salidas.length === 0) return salidas
  const [detalles] = await pool.query(
    `SELECT d.salida_id, d.material_id, m.codigo AS material_codigo, m.descripcion AS material, m.unidad_medida,
            d.cantidad_despachada, d.costo_unitario_momento,
            ROUND(d.cantidad_despachada * d.costo_unitario_momento, 2) AS subtotal
       FROM detalles_salida_materiales d JOIN materiales m ON m.id = d.material_id
      WHERE d.salida_id IN (?) ORDER BY d.id`,
    [salidas.map((s) => s.id)],
  )
  return salidas.map((s) => {
    const lineas = detalles.filter((d) => d.salida_id === s.id)
    return { ...s, detalles: lineas, costo_total: Math.round(lineas.reduce((t, d) => t + Number(d.subtotal), 0) * 100) / 100 }
  })
}

export async function listar() {
  const [rows] = await pool.query(`${SELECT} ORDER BY s.fecha_salida DESC, s.id DESC`)
  return conDetalles(rows)
}

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE s.id = ? LIMIT 1`, [id])
  return (await conDetalles(rows))[0] || null
}
