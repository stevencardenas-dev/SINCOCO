/**
 * Entity que representa la tabla `usuarios`.
 * Se usa únicamente para validar `creado_por_usuario_id` en HU-02,
 * campo requerido por el SQL (NOT NULL) mientras no exista HU-01 (auth).
 */
class Usuario {
  constructor({ id, username, email, estado, activo }) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.estado = estado;
    this.activo = activo;
  }

  static fromRow(row) {
    if (!row) return null;
    return new Usuario(row);
  }
}

module.exports = Usuario;
