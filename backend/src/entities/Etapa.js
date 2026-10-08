/**
 * Entity que representa la tabla `etapas_proyecto` (HU-03).
 */
export class Etapa {
  constructor({
    id,
    proyecto_id,
    nombre,
    descripcion,
    orden,
    fecha_inicio_programada,
    fecha_fin_programada,
    fecha_inicio_original,
    fecha_fin_original,
    estado,
    activo,
  }) {
    this.id = id
    this.proyecto_id = proyecto_id
    this.nombre = nombre
    this.descripcion = descripcion ?? null
    this.orden = orden
    this.fecha_inicio_programada = fecha_inicio_programada ?? null
    this.fecha_fin_programada = fecha_fin_programada ?? null
    // HU-34 · criterio 1: fechas de la primera programación (NULL si nunca se reprogramó).
    this.fecha_inicio_original = fecha_inicio_original ?? null
    this.fecha_fin_original = fecha_fin_original ?? null
    this.estado = estado
    this.activo = activo
  }

  static fromRow(row) {
    if (!row) return null
    return new Etapa(row)
  }
}
