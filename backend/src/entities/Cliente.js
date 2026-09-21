/**
 * Entity que representa la tabla `clientes` (HU-02).
 * Solo se exponen las columnas necesarias para validar el cliente
 * indicado al registrar un proyecto (CU-02).
 */
export class Cliente {
  constructor({ id, numero_documento, tipo_documento, razon_social_nombre, estado, activo }) {
    this.id = id
    this.numero_documento = numero_documento
    this.tipo_documento = tipo_documento
    this.razon_social_nombre = razon_social_nombre
    this.estado = estado
    this.activo = activo
  }

  static fromRow(row) {
    if (!row) return null
    return new Cliente(row)
  }
}
