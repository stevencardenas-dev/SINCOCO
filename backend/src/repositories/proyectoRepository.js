import { pool } from '../db/pool.js'
import { Proyecto } from '../entities/Proyecto.js'

/**
 * Repositorio de la tabla `proyectos` (HU-02).
 */

/**
 * Verifica si ya existe un proyecto con el código dado.
 * `proyectos.codigo` tiene UNIQUE KEY en el esquema.
 */
export async function findByCodigo(codigo) {
  const [rows] = await pool.query('SELECT id FROM proyectos WHERE codigo = ? LIMIT 1', [codigo])
  return rows[0] || null
}

/**
 * Busca un proyecto por id, con el nombre del cliente y del responsable
 * para las pantallas del módulo de proyectos (CU-02).
 */
export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT p.*, c.razon_social_nombre AS cliente_nombre,
            TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS responsable_nombre
     FROM proyectos p
     JOIN clientes c ON c.id = p.cliente_id
     JOIN trabajadores t ON t.id = p.responsable_id
     WHERE p.id = ? LIMIT 1`,
    [id],
  )
  return Proyecto.fromRow(rows[0])
}

/**
 * Lista proyectos activos, más recientes primero (módulo de proyectos).
 */
export async function listarActivos() {
  const [rows] = await pool.query(
    `SELECT p.*, c.razon_social_nombre AS cliente_nombre,
            TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS responsable_nombre
     FROM proyectos p
     JOIN clientes c ON c.id = p.cliente_id
     JOIN trabajadores t ON t.id = p.responsable_id
     WHERE p.activo = 1
     ORDER BY p.creado_en DESC, p.id DESC`,
  )
  return rows.map(Proyecto.fromRow)
}

/**
 * Inserta un nuevo proyecto. Recibe un objeto ya validado y con los
 * valores iniciales (estado, porcentaje_avance_total) aplicados por el
 * service. Devuelve el id autogenerado.
 */
export async function create(proyecto) {
  const sql = `
    INSERT INTO proyectos (
      codigo, cliente_id, nombre, descripcion, ubicacion,
      fecha_inicio_programada, fecha_fin_programada,
      responsable_id, creado_por_usuario_id,
      presupuesto_inicial, porcentaje_avance_total, estado, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const params = [
    proyecto.codigo,
    proyecto.cliente_id,
    proyecto.nombre,
    proyecto.descripcion,
    proyecto.ubicacion,
    proyecto.fecha_inicio_programada,
    proyecto.fecha_fin_programada,
    proyecto.responsable_id,
    proyecto.creado_por_usuario_id,
    proyecto.presupuesto_inicial,
    proyecto.porcentaje_avance_total,
    proyecto.estado,
    proyecto.observaciones,
  ]

  const [result] = await pool.query(sql, params)
  return result.insertId
}
