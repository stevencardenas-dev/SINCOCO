/**
 * Entity que representa la tabla `clientes` (HU-02).
 * Se usa para validar el cliente indicado al registrar un proyecto (CU-02)
 * y para alimentar el catálogo del formulario.
 */
export class Cliente {
  constructor({
    id,
    numero_documento,
    tipo_documento,
    razon_social_nombre,
    nombre_contacto,
    telefono,
    email,
    direccion,
    estado,
    activo,
  }) {
    this.id = id
    this.numero_documento = numero_documento
    this.tipo_documento = tipo_documento
    this.razon_social_nombre = razon_social_nombre
    this.nombre_contacto = nombre_contacto ?? null
    this.telefono = telefono ?? null
    this.email = email ?? null
    this.direccion = direccion ?? null
    this.estado = estado
    this.activo = activo
  }

  static fromRow(row) {
    if (!row) return null
    return new Cliente(row)
  }
}
