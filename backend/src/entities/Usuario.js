/**
 * Entity que representa la tabla `usuarios` (HU-02).
 * Se usa para validar que el usuario autenticado que registra el
 * proyecto (`creado_por_usuario_id`, NOT NULL en el esquema) exista.
 */
export class Usuario {
  constructor({ id, username, estado, activo }) {
    this.id = id
    this.username = username
    this.estado = estado
    this.activo = activo
  }

  static fromRow(row) {
    if (!row) return null
    return new Usuario(row)
  }
}
