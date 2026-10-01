import { AppError } from './AppError.js'

/**
 * Utilidades de fechas compartidas por el plan de trabajo.
 *
 * Viven fuera de los servicios para que estos puedan usarlas sin depender
 * entre sí (acceso, etapas y actividades comparten las mismas reglas).
 */

/** Normaliza una fecha a 'YYYY-MM-DD' para comparar solo el día. */
export function aFechaDia(valor) {
  if (!valor) return null
  if (typeof valor === 'string') return valor.slice(0, 10)
  const d = new Date(valor)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/**
 * HU-03 · criterio 3: las fechas programadas de etapas, actividades y
 * asignaciones deben mantenerse dentro del rango de fechas del proyecto.
 */
export function validarFechasEnRango(inicio, fin, proyecto) {
  const pInicio = aFechaDia(proyecto.fecha_inicio_programada)
  const pFin = aFechaDia(proyecto.fecha_fin_programada)

  for (const [campo, valor] of [['fecha_inicio_programada', inicio], ['fecha_fin_programada', fin]]) {
    const f = aFechaDia(valor)
    if (!f) continue
    if (pInicio && f < pInicio) {
      throw new AppError('La fecha no puede ser anterior al inicio del proyecto', 400, campo)
    }
    if (pFin && f > pFin) {
      throw new AppError('La fecha no puede ser posterior al fin del proyecto', 400, campo)
    }
  }

  const i = aFechaDia(inicio)
  const f = aFechaDia(fin)
  if (i && f && i > f) {
    throw new AppError(
      'La fecha de inicio de la actividad debe ser anterior a la de fin',
      400,
      'fecha_fin_programada',
    )
  }
}
