const pool = require('../config/database');
const Trabajador = require('../entities/Trabajador');

/**
 * Busca un trabajador por su id. Se usa para validar `responsable_id`
 * en el registro de proyectos (HU-02), ya que el FK de
 * `proyectos.responsable_id` apunta a `trabajadores`.
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, numero_documento, nombres, apellidos, cargo, disponible, estado, activo FROM trabajadores WHERE id = ? LIMIT 1',
    [id]
  );
  return Trabajador.fromRow(rows[0]);
}

module.exports = { findById };
