const num = (v) => (v === null || v === undefined ? 0 : Number(v))

/**
 * Entity que representa la tabla `materiales` (HU-07).
 * `bajo_minimo` no es columna: se deriva de la existencia y el nivel mínimo, y
 * es el umbral que usará la alerta de stock (CU-27).
 */
export class Material {
  constructor({
    id,
    codigo,
    categoria_id,
    categoria,
    descripcion,
    unidad_medida,
    existencia_total,
    costo_referencia,
    nivel_minimo,
    estado,
    activo,
    fecha_baja,
  }) {
    this.id = id
    this.codigo = codigo
    this.categoria_id = categoria_id
    this.categoria = categoria ?? null
    this.descripcion = descripcion
    this.unidad_medida = unidad_medida
    this.existencia_total = num(existencia_total)
    this.costo_referencia = num(costo_referencia)
    this.nivel_minimo = num(nivel_minimo)
    this.estado = estado
    this.activo = activo
    this.fecha_baja = fecha_baja ?? null
    this.bajo_minimo =
      Number(activo) === 1 && this.nivel_minimo > 0 && this.existencia_total <= this.nivel_minimo
  }

  static fromRow(row) {
    if (!row) return null
    return new Material(row)
  }
}
