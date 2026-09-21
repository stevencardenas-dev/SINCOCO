const pool = require('../config/database');
const Proyecto = require('../entities/Proyecto');

/**
 * Verifica si ya existe un proyecto con el código dado.
 * Necesario porque `proyectos.codigo` tiene UNIQUE KEY en el SQL.
 */
async function findByCodigo(codigo) {
  const [rows] = await pool.query('SELECT id FROM proyectos WHERE codigo = ? LIMIT 1', [codigo]);
  return rows[0] || null;
}

/**
 * Busca un proyecto por su id (usado para devolver el proyecto
 * recién creado con todos sus campos, incluidos los valores
 * generados por la base de datos como `creado_en`).
 */
async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM proyectos WHERE id = ? LIMIT 1', [id]);
  return Proyecto.fromRow(rows[0]);
}

/**
 * Inserta un nuevo proyecto. Recibe un objeto ya validado y con
 * los valores iniciales (estado, porcentaje_avance_total) aplicados
 * por el service. Devuelve el id autogenerado.
 */
async function create(proyecto) {
  const sql = `
    INSERT INTO proyectos (
      codigo, cliente_id, nombre, descripcion, ubicacion,
      fecha_inicio_programada, fecha_fin_programada,
      responsable_id, creado_por_usuario_id,
      presupuesto_inicial, porcentaje_avance_total, estado, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

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
  ];

  const [result] = await pool.query(sql, params);
  return result.insertId;
}

module.exports = { findByCodigo, findById, create };
