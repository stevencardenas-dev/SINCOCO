/**
 * Entity que representa la tabla `proveedores` (HU-13).
 * Alimenta el catálogo de proveedores y, más adelante, la asociación a
 * órdenes de compra.
 */
export class Proveedor {
  constructor({
    id,
    documento_identificacion,
    razon_social,
    nombre_contacto,
    telefono,
    email,
    direccion,
    estado,
    activo,
  }) {
    this.id = id
    this.documento_identificacion = documento_identificacion
    this.razon_social = razon_social
    this.nombre_contacto = nombre_contacto ?? null
    this.telefono = telefono ?? null
    this.email = email ?? null
    this.direccion = direccion ?? null
    this.estado = estado
    this.activo = activo
  }

  static fromRow(row) {
    if (!row) return null
    return new Proveedor(row)
  }
}
