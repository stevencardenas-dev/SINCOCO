const pool = require('../config/database');
const Usuario = require('../entities/Usuario');

/**
 * Busca un usuario por su id. Se usa para validar
 * `creado_por_usuario_id` en el registro de proyectos (HU-02),
 * campo NOT NULL en el SQL mientras no exista HU-01 (auth).
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, email, estado, activo FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return Usuario.fromRow(rows[0]);
}

module.exports = { findById };
