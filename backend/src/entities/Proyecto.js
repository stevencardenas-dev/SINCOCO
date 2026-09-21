/**
 * Entity que representa la tabla `proyectos` del esquema de la entrega
 * (docs/schema.sql). Respeta exactamente los nombres de columnas.
 */
export class Proyecto {
  constructor({
    id,
    codigo,
    cliente_id,
    nombre,
    descripcion,
    ubicacion,
    fecha_inicio_programada,
    fecha_fin_programada,
    fecha_inicio_real,
    fecha_fin_real,
    responsable_id,
    creado_por_usuario_id,
    presupuesto_inicial,
    porcentaje_avance_total,
    estado,
    observaciones,
    creado_en,
    actualizado_en,
    activo,
    // Campos de lectura (JOIN con clientes/trabajadores) para las pantallas.
    cliente_nombre,
    responsable_nombre,
  }) {
    this.id = id
    this.codigo = codigo
    this.cliente_id = cliente_id
    this.nombre = nombre
    this.descripcion = descripcion
    this.ubicacion = ubicacion
    this.fecha_inicio_programada = fecha_inicio_programada
    this.fecha_fin_programada = fecha_fin_programada
    this.fecha_inicio_real = fecha_inicio_real
    this.fecha_fin_real = fecha_fin_real
    this.responsable_id = responsable_id
    this.creado_por_usuario_id = creado_por_usuario_id
    this.presupuesto_inicial = presupuesto_inicial
    this.porcentaje_avance_total = porcentaje_avance_total
    this.estado = estado
    this.observaciones = observaciones
    this.creado_en = creado_en
    this.actualizado_en = actualizado_en
    this.activo = activo
    this.cliente_nombre = cliente_nombre ?? null
    this.responsable_nombre = responsable_nombre ?? null
  }

  static fromRow(row) {
    if (!row) return null
    return new Proyecto(row)
  }
}
