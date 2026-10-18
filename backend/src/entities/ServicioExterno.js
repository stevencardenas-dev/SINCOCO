/** Entity de la tabla `servicios_externos` (HU-28), con nombres de lectura para las pantallas. */
export class ServicioExterno {
  constructor(row) {
    Object.assign(this, row)
    this.actividad_id = row.actividad_id ?? null
    this.descripcion = row.descripcion ?? null
    this.observaciones = row.observaciones ?? null
    // decimal(15,2) llega como texto: se entrega como número.
    this.valor_contratado = Number(row.valor_contratado)
  }

  static fromRow(row) {
    return row ? new ServicioExterno(row) : null
  }
}
