/**
 * Entity que representa la tabla `clientes`.
 * Solo se exponen las columnas necesarias para validar HU-02.
 */
class Cliente {
  constructor({ id, numero_documento, tipo_documento, razon_social_nombre, estado, activo }) {
    this.id = id;
    this.numero_documento = numero_documento;
    this.tipo_documento = tipo_documento;
    this.razon_social_nombre = razon_social_nombre;
    this.estado = estado;
    this.activo = activo;
  }

  static fromRow(row) {
    if (!row) return null;
    return new Cliente(row);
  }
}

module.exports = Cliente;
