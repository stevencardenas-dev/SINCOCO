import { pool } from '../db/pool.js'

/**
 * Indicadores del panel de inicio (RF04 · RF25 · RF26 · RF31).
 *
 * Todo lo que devuelve esta consulta sale de las tablas del sistema: no hay
 * series ni totales de demostración. Si una tabla está vacía, el indicador vale
 * cero y la pantalla debe decirlo, no rellenarlo con datos inventados.
 *
 * Aún no existen los módulos de inventario, costos e incidencias (HU-07 a
 * HU-30), así que esas tablas están vacías y sus indicadores salen en cero;
 * la fórmula del costo es la de HU-15 (materiales despachados + servicios
 * externos + órdenes de compra) y funciona en cuanto haya movimientos.
 */

// MySQL devuelve los DECIMAL como texto; el frontend necesita números.
const num = (valor) => Number(valor ?? 0)

export async function resumen(req, res) {
  // --- Proyectos (RF03 · HU-02) ------------------------------------------------
  const [[proyectos]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(activo = 1), 0) AS activos,
            COALESCE(SUM(activo = 0), 0) AS inactivos,
            COALESCE(SUM(CASE WHEN activo = 1 THEN presupuesto_inicial END), 0) AS presupuesto_activos
       FROM proyectos`,
  )
  const [porEstado] = await pool.query(
    `SELECT estado, COUNT(*) AS total
       FROM proyectos WHERE activo = 1
      GROUP BY estado ORDER BY total DESC`,
  )
  // Solo los proyectos vigentes: el avance de un proyecto dado de baja ya no es
  // un indicador operativo (HU-18).
  const [avance] = await pool.query(
    `SELECT id, codigo, nombre, estado, porcentaje_avance_total
       FROM proyectos WHERE activo = 1
      ORDER BY porcentaje_avance_total DESC, codigo
      LIMIT 8`,
  )

  // --- Inventario (RF23 · HU-23) -----------------------------------------------
  // Regla del criterio: hay alerta cuando la existencia es igual o inferior al
  // nivel mínimo configurado para el material.
  const [[inventario]] = await pool.query(
    `SELECT COUNT(*) AS materiales,
            COALESCE(SUM(existencia_total <= nivel_minimo), 0) AS bajo_stock
       FROM materiales WHERE activo = 1`,
  )
  const [bajoStock] = await pool.query(
    `SELECT id, codigo, descripcion, unidad_medida, existencia_total, nivel_minimo
       FROM materiales
      WHERE activo = 1 AND existencia_total <= nivel_minimo
      ORDER BY (nivel_minimo - existencia_total) DESC, descripcion
      LIMIT 5`,
  )
  const [[alertas]] = await pool.query(
    'SELECT COALESCE(SUM(atendida = 0), 0) AS pendientes FROM alertas',
  )

  // --- Personal (RF06 · HU-04) -------------------------------------------------
  const [[personal]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(activo = 1), 0) AS activos
       FROM trabajadores`,
  )
  const [porCargo] = await pool.query(
    `SELECT cargo, COUNT(*) AS total
       FROM trabajadores WHERE activo = 1
      GROUP BY cargo ORDER BY total DESC, cargo`,
  )
  const [[cuentas]] = await pool.query(
    'SELECT COUNT(*) AS activos FROM usuarios WHERE activo = 1',
  )

  // --- Costos (RF26 · HU-15) ---------------------------------------------------
  const [[costos]] = await pool.query(
    `SELECT
       (SELECT COALESCE(SUM(d.cantidad_despachada * d.costo_unitario_momento), 0)
          FROM detalles_salida_materiales d
          JOIN salidas_materiales s ON s.id = d.salida_id) AS materiales_despachados,
       (SELECT COALESCE(SUM(valor_contratado), 0)
          FROM servicios_externos WHERE estado <> 'CANCELADO') AS servicios_externos,
       (SELECT COALESCE(SUM(monto_total), 0)
          FROM ordenes_compra WHERE activo = 1 AND estado <> 'CANCELADA') AS ordenes_compra`,
  )

  // --- Incidencias de obra (RF22 · HU-14) --------------------------------------
  const [[incidencias]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(estado IN ('ABIERTA', 'EN_REVISION')), 0) AS abiertas
       FROM incidencias`,
  )
  const [ultimasIncidencias] = await pool.query(
    `SELECT i.id, i.titulo, i.descripcion, i.severidad, i.estado, i.fecha_incidencia,
            p.codigo, p.nombre AS proyecto
       FROM incidencias i
       JOIN proyectos p ON p.id = i.proyecto_id
      WHERE i.estado IN ('ABIERTA', 'EN_REVISION')
      ORDER BY FIELD(i.severidad, 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'), i.fecha_incidencia DESC
      LIMIT 3`,
  )

  res.json({
    generado_en: new Date().toISOString(),
    proyectos: {
      total: num(proyectos.total),
      activos: num(proyectos.activos),
      inactivos: num(proyectos.inactivos),
      presupuesto_activos: num(proyectos.presupuesto_activos),
      por_estado: porEstado.map((e) => ({ estado: e.estado, total: num(e.total) })),
      avance: avance.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        estado: p.estado,
        avance: num(p.porcentaje_avance_total),
      })),
    },
    inventario: {
      materiales: num(inventario.materiales),
      bajo_stock: num(inventario.bajo_stock),
      alertas_pendientes: num(alertas.pendientes),
      detalle: bajoStock.map((m) => ({
        id: m.id,
        codigo: m.codigo,
        descripcion: m.descripcion,
        unidad_medida: m.unidad_medida,
        existencia_total: num(m.existencia_total),
        nivel_minimo: num(m.nivel_minimo),
      })),
    },
    personal: {
      total: num(personal.total),
      activos: num(personal.activos),
      con_cuenta: num(cuentas.activos),
      por_cargo: porCargo.map((c) => ({ cargo: c.cargo, total: num(c.total) })),
    },
    costos: {
      materiales_despachados: num(costos.materiales_despachados),
      servicios_externos: num(costos.servicios_externos),
      ordenes_compra: num(costos.ordenes_compra),
      total:
        num(costos.materiales_despachados) +
        num(costos.servicios_externos) +
        num(costos.ordenes_compra),
    },
    incidencias: {
      total: num(incidencias.total),
      abiertas: num(incidencias.abiertas),
      ultimas: ultimasIncidencias,
    },
  })
}
