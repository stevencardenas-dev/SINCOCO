/**
 * Entity que representa la tabla `actividades` (HU-03).
 * Incluye campos de lectura (nombre de etapa, proyecto y responsable) para las
 * pantallas del plan de trabajo.
 */
export class Actividad {
  constructor({
    id,
    etapa_id,
    responsable_id,
    nombre,
    descripcion,
    fecha_inicio_programada,
    fecha_fin_programada,
    fecha_inicio_real,
    fecha_fin_real,
    porcentaje_avance,
    estado,
    activo,
    etapa_nombre,
    proyecto_id,
    responsable_nombre,
  }) {
    this.id = id
    this.etapa_id = etapa_id
    this.responsable_id = responsable_id ?? null
    this.nombre = nombre
    this.descripcion = descripcion ?? null
    this.fecha_inicio_programada = fecha_inicio_programada
    this.fecha_fin_programada = fecha_fin_programada
    this.fecha_inicio_real = fecha_inicio_real ?? null
    this.fecha_fin_real = fecha_fin_real ?? null
    this.porcentaje_avance = porcentaje_avance
    this.estado = estado
    this.activo = activo
    this.etapa_nombre = etapa_nombre ?? null
    this.proyecto_id = proyecto_id ?? null
    this.responsable_nombre = responsable_nombre ?? null
  }

  static fromRow(row) {
    if (!row) return null
    return new Actividad(row)
  }
}
