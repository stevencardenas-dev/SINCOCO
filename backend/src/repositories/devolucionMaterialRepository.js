import { pool } from '../db/pool.js'

/** Repositorio de `devoluciones_materiales` (HU-09). */

const SELECT = `SELECT d.id, CONCAT('DV-', LPAD(d.id, 5, '0')) AS comprobante,
                       d.almacen_destino_id, a.nombre AS almacen,
                       d.proyecto_id, p.nombre AS proyecto, d.actividad_id, ac.nombre AS actividad,
                       d.material_id, m.codigo AS material_codigo, m.descripcion AS material, m.unidad_medida,
                       d.cantidad, d.apto, d.costo_unitario,
                       ROUND(d.cantidad * d.costo_unitario * d.apto, 2) AS ajuste_costo,
                       d.devuelto_por_trabajador_id, CONCAT(t.nombres, ' ', t.apellidos) AS devuelto_por,
                       d.recibido_por_usuario_id, COALESCE(CONCAT(tr.nombres, ' ', tr.apellidos), u.username) AS recibido_por,
                       d.fecha_devolucion, d.motivo, d.salida_origen_id,
                       IF(d.salida_origen_id IS NULL, NULL, CONCAT('SA-', LPAD(d.salida_origen_id, 5, '0'))) AS salida_origen
                  FROM devoluciones_materiales d
                  JOIN almacenes a ON a.id = d.almacen_destino_id
                  JOIN proyectos p ON p.id = d.proyecto_id
                  LEFT JOIN actividades ac ON ac.id = d.actividad_id
                  JOIN materiales m ON m.id = d.material_id
                  JOIN trabajadores t ON t.id = d.devuelto_por_trabajador_id
                  JOIN usuarios u ON u.id = d.recibido_por_usuario_id
                  LEFT JOIN trabajadores tr ON tr.id = u.trabajador_id`

export async function findById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE d.id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export async function listar() {
  const [rows] = await pool.query(`${SELECT} ORDER BY d.fecha_devolucion DESC, d.id DESC`)
  return rows
}

/** Opciones del formulario: solo lo mínimo, sin exigir los permisos de los otros módulos. */
export async function opciones() {
  const [proyectos] = await pool.query('SELECT id, codigo, nombre FROM proyectos WHERE activo = 1 ORDER BY nombre')
  const [trabajadores] = await pool.query(
    "SELECT id, CONCAT(nombres, ' ', apellidos) AS nombre FROM trabajadores WHERE activo = 1 ORDER BY nombres, apellidos",
  )
  const [almacenes] = await pool.query('SELECT id, codigo, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre')
  const [materiales] = await pool.query(
    'SELECT id, codigo, descripcion, unidad_medida FROM materiales WHERE activo = 1 ORDER BY codigo',
  )
  return { proyectos, trabajadores, almacenes, materiales }
}

export async function actividadesDeProyecto(proyectoId) {
  const [rows] = await pool.query(
    `SELECT a.id, a.nombre FROM actividades a JOIN etapas_proyecto e ON e.id = a.etapa_id
      WHERE e.proyecto_id = ? AND a.activo = 1 AND e.activo = 1 ORDER BY e.id, a.id`,
    [proyectoId],
  )
  return rows
}

/**
 * Salidas del proyecto con sus materiales, lo ya devuelto y lo que todavía se puede devolver,
 * para elegir la salida que originó la devolución.
 */
export async function salidasDeProyecto(proyectoId) {
  const [salidas] = await pool.query(
    `SELECT s.id, CONCAT('SA-', LPAD(s.id, 5, '0')) AS codigo, s.actividad_id, s.fecha_salida
       FROM salidas_materiales s WHERE s.proyecto_id = ? ORDER BY s.fecha_salida DESC, s.id DESC`,
    [proyectoId],
  )
  if (salidas.length === 0) return []
  const ids = salidas.map((s) => s.id)
  const [detalles] = await pool.query(
    `SELECT d.salida_id, d.material_id, m.codigo AS material_codigo, m.descripcion AS material, m.unidad_medida,
            SUM(d.cantidad_despachada) AS despachado
       FROM detalles_salida_materiales d JOIN materiales m ON m.id = d.material_id
      WHERE d.salida_id IN (?) GROUP BY d.salida_id, d.material_id, m.codigo, m.descripcion, m.unidad_medida`,
    [ids],
  )
  const [devueltos] = await pool.query(
    `SELECT salida_origen_id AS salida_id, material_id, SUM(cantidad) AS devuelto
       FROM devoluciones_materiales WHERE salida_origen_id IN (?) GROUP BY salida_origen_id, material_id`,
    [ids],
  )
  return salidas.map((s) => ({
    ...s,
    materiales: detalles.filter((d) => d.salida_id === s.id).map((d) => {
      const devuelto = Number(devueltos.find((v) => v.salida_id === s.id && v.material_id === d.material_id)?.devuelto ?? 0)
      return { ...d, despachado: Number(d.despachado), devuelto, disponible_devolver: Number(d.despachado) - devuelto }
    }),
  }))
}

/**
 * Registra la devolución en una transacción: bloquea el material, valida con los datos leídos
 * (`validar`) y la inserta; el trigger trg_devolucion_suma_existencia suma la existencia solo
 * si la devolución es apta. `validar` devuelve el costo unitario a registrar.
 */
export async function registrar({ almacenId, proyectoId, actividadId, materialId, trabajadorId, usuarioId, cantidad, apto, motivo, salidaId, validar }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[almacen]] = await conn.query('SELECT * FROM almacenes WHERE id = ?', [almacenId])
    const [[proyecto]] = await conn.query('SELECT * FROM proyectos WHERE id = ?', [proyectoId])
    const [[actividad]] = await conn.query(
      `SELECT a.*, e.proyecto_id FROM actividades a JOIN etapas_proyecto e ON e.id = a.etapa_id WHERE a.id = ?`,
      [actividadId],
    )
    const [[material]] = await conn.query('SELECT * FROM materiales WHERE id = ? FOR UPDATE', [materialId])
    const [[trabajador]] = await conn.query('SELECT * FROM trabajadores WHERE id = ?', [trabajadorId])
    let salida = null
    let despachado = 0
    let devuelto = 0
    let costoSalida = null
    if (salidaId) {
      ;[[salida]] = await conn.query('SELECT * FROM salidas_materiales WHERE id = ? FOR UPDATE', [salidaId])
      const [[d]] = await conn.query(
        `SELECT SUM(cantidad_despachada) AS despachado, MAX(costo_unitario_momento) AS costo
           FROM detalles_salida_materiales WHERE salida_id = ? AND material_id = ?`,
        [salidaId, materialId],
      )
      despachado = Number(d?.despachado ?? 0)
      costoSalida = d?.costo ?? null
      const [[v]] = await conn.query(
        'SELECT COALESCE(SUM(cantidad), 0) AS devuelto FROM devoluciones_materiales WHERE salida_origen_id = ? AND material_id = ?',
        [salidaId, materialId],
      )
      devuelto = Number(v.devuelto)
    }
    const costoUnitario = validar({ almacen, proyecto, actividad, material, trabajador, salida, despachado, devuelto, costoSalida })

    const [ins] = await conn.query(
      `INSERT INTO devoluciones_materiales
         (almacen_destino_id, proyecto_id, actividad_id, material_id, devuelto_por_trabajador_id, recibido_por_usuario_id,
          cantidad, apto, costo_unitario, motivo, salida_origen_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [almacenId, proyectoId, actividadId, materialId, trabajadorId, usuarioId, cantidad, apto ? 1 : 0, costoUnitario, motivo, salidaId ?? null],
    )
    await conn.commit()
    return ins.insertId
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
