const pool = require('../config/database');
const Cliente = require('../entities/Cliente');

/**
 * Busca un cliente por su id. Necesario para validar que
 * `cliente_id` exista antes de registrar un proyecto (HU-02).
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, numero_documento, tipo_documento, razon_social_nombre, estado, activo FROM clientes WHERE id = ? LIMIT 1',
    [id]
  );
  return Cliente.fromRow(rows[0]);
}

module.exports = { findById };
