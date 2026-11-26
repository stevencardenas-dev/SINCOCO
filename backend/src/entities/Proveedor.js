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
    fecha_baja,
    documentos,
    puntualidad_promedio,
    calidad_promedio,
    calificaciones,
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
    this.fecha_baja = fecha_baja ?? null
    this.documentos = Number(documentos ?? 0)
    // HU-41: promedio histórico por criterio y número de calificaciones.
    this.puntualidad_promedio = puntualidad_promedio === null || puntualidad_promedio === undefined
      ? null
      : Number(puntualidad_promedio)
    this.calidad_promedio = calidad_promedio === null || calidad_promedio === undefined
      ? null
      : Number(calidad_promedio)
    this.calificaciones = Number(calificaciones ?? 0)
  }

  static fromRow(row) {
    if (!row) return null
    return new Proveedor(row)
  }
}
