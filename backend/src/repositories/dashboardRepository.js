import { pool } from '../db/pool.js'

/**
 * Consultas de los indicadores del panel de inicio. Devuelven las filas tal
 * como salen de la base; `services/dashboardService.js` las convierte en el
 * resumen que consume el frontend.
 */

// --- Proyectos (RF03 · HU-02) ------------------------------------------------
export async function totalesProyectos() {
  const [[fila]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(activo = 1), 0) AS activos,
            COALESCE(SUM(activo = 0), 0) AS inactivos,
            COALESCE(SUM(CASE WHEN activo = 1 THEN presupuesto_inicial END), 0) AS presupuesto_activos
       FROM proyectos`,
  )
  return fila
}

export async function proyectosPorEstado() {
  const [rows] = await pool.query(
    `SELECT estado, COUNT(*) AS total
       FROM proyectos WHERE activo = 1
      GROUP BY estado ORDER BY total DESC`,
  )
  return rows
}

// Solo los proyectos vigentes: el avance de un proyecto dado de baja ya no es
// un indicador operativo (HU-18).
export async function avanceProyectos() {
  const [rows] = await pool.query(
    `SELECT id, codigo, nombre, estado, porcentaje_avance_total
       FROM proyectos WHERE activo = 1
      ORDER BY porcentaje_avance_total DESC, codigo
      LIMIT 8`,
  )
  return rows
}

// --- Inventario (RF23 · HU-23) -----------------------------------------------
// Regla del criterio: hay alerta cuando la existencia es igual o inferior al
// nivel mínimo configurado para el material.
export async function totalesInventario() {
  const [[fila]] = await pool.query(
    `SELECT COUNT(*) AS materiales,
            COALESCE(SUM(existencia_total <= nivel_minimo), 0) AS bajo_stock
       FROM materiales WHERE activo = 1`,
  )
  return fila
}

export async function materialesBajoStock() {
  const [rows] = await pool.query(
    `SELECT id, codigo, descripcion, unidad_medida, existencia_total, nivel_minimo
       FROM materiales
      WHERE activo = 1 AND existencia_total <= nivel_minimo
      ORDER BY (nivel_minimo - existencia_total) DESC, descripcion
      LIMIT 5`,
  )
  return rows
}

export async function alertasPendientes() {
  const [[fila]] = await pool.query(
    'SELECT COALESCE(SUM(atendida = 0), 0) AS pendientes FROM alertas',
  )
  return fila
}

// --- Personal (RF06 · HU-04) -------------------------------------------------
export async function totalesPersonal() {
  const [[fila]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(activo = 1), 0) AS activos
       FROM trabajadores`,
  )
  return fila
}

// HU-04: el cargo vive en el catálogo `cargos` (tabla de dominio).
export async function personalPorCargo() {
  const [rows] = await pool.query(
    `SELECT c.nombre AS cargo, COUNT(*) AS total
       FROM trabajadores t JOIN cargos c ON c.id = t.cargo_id
      WHERE t.activo = 1
      GROUP BY c.id, c.nombre ORDER BY total DESC, c.nombre`,
  )
  return rows
}

export async function cuentasActivas() {
  const [[fila]] = await pool.query('SELECT COUNT(*) AS activos FROM usuarios WHERE activo = 1')
  return fila
}

// --- Costos (RF26 · HU-15) ---------------------------------------------------
export async function totalesCostos() {
  const [[fila]] = await pool.query(
    `SELECT
       (SELECT COALESCE(SUM(d.cantidad_despachada * d.costo_unitario_momento), 0)
          FROM detalles_salida_materiales d
          JOIN salidas_materiales s ON s.id = d.salida_id) AS materiales_despachados,
       (SELECT COALESCE(SUM(valor_contratado), 0)
          FROM servicios_externos WHERE estado <> 'CANCELADO') AS servicios_externos,
       (SELECT COALESCE(SUM(monto_total), 0)
          FROM ordenes_compra WHERE activo = 1 AND estado <> 'CANCELADA') AS ordenes_compra`,
  )
  return fila
}

// --- Incidencias de obra (RF22 · HU-14) --------------------------------------
export async function totalesIncidencias() {
  const [[fila]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(estado IN ('ABIERTA', 'EN_REVISION')), 0) AS abiertas
       FROM incidencias`,
  )
  return fila
}

export async function ultimasIncidenciasAbiertas() {
  const [rows] = await pool.query(
    `SELECT i.id, i.titulo, i.descripcion, i.severidad, i.estado, i.fecha_incidencia,
            p.codigo, p.nombre AS proyecto
       FROM incidencias i
       JOIN proyectos p ON p.id = i.proyecto_id
      WHERE i.estado IN ('ABIERTA', 'EN_REVISION')
      ORDER BY FIELD(i.severidad, 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'), i.fecha_incidencia DESC
      LIMIT 3`,
  )
  return rows
}
