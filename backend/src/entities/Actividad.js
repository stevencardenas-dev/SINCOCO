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
    fecha_inicio_original,
    fecha_fin_original,
    fecha_inicio_real,
    fecha_fin_real,
    porcentaje_avance,
    peso,
    presupuesto,
    esfuerzo,
    total_criterios,
    criterios_cumplidos,
    estado,
    activo,
    etapa_nombre,
    proyecto_id,
    responsable_nombre,
    atrasada,
  }) {
    this.id = id
    this.etapa_id = etapa_id
    this.responsable_id = responsable_id ?? null
    this.nombre = nombre
    this.descripcion = descripcion ?? null
    this.fecha_inicio_programada = fecha_inicio_programada
    this.fecha_fin_programada = fecha_fin_programada
    // HU-34 · criterio 1: fechas de la primera programación (NULL si nunca se reprogramó).
    this.fecha_inicio_original = fecha_inicio_original ?? null
    this.fecha_fin_original = fecha_fin_original ?? null
    this.fecha_inicio_real = fecha_inicio_real ?? null
    this.fecha_fin_real = fecha_fin_real ?? null
    this.porcentaje_avance = porcentaje_avance
    // HU-21 · criterio 4: peso de la actividad en el promedio ponderado de etapa y proyecto.
    this.peso = peso === undefined || peso === null ? 3 : Number(peso)
    // HU-28 · criterio 4: monto asignado a la actividad (null = sin presupuesto definido).
    this.presupuesto = presupuesto === undefined || presupuesto === null ? null : Number(presupuesto)
    // Esfuerzo cualitativo que determina el peso (Muy alto 8, Alto 5, Medio 3, Bajo 2, Muy bajo 1).
    this.esfuerzo = esfuerzo ?? 'MEDIO'
    // Criterios de aceptación: el avance es cumplidos / total.
    this.total_criterios = Number(total_criterios ?? 0)
    this.criterios_cumplidos = Number(criterios_cumplidos ?? 0)
    this.estado = estado
    this.activo = activo
    this.etapa_nombre = etapa_nombre ?? null
    this.proyecto_id = proyecto_id ?? null
    this.responsable_nombre = responsable_nombre ?? null
    // Derivado: sigue sin finalizar y ya pasó su fecha fin programada.
    this.atrasada = Boolean(atrasada)
  }

  static fromRow(row) {
    if (!row) return null
    return new Actividad(row)
  }
}
