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
export function validarFechasEnRango(inicio, fin, proyecto, elemento = 'la actividad') {
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
      `La fecha de inicio de ${elemento} debe ser anterior a la de fin`,
      400,
      'fecha_fin_programada',
    )
  }
}

/**
 * Las fechas de un elemento del plan (una actividad) deben quedar dentro del
 * rango de su contenedor (la etapa). Si el contenedor no tiene fechas no limita.
 */
export function validarDentroDeEtapa(inicio, fin, etapa) {
  const eInicio = aFechaDia(etapa.fecha_inicio_programada)
  const eFin = aFechaDia(etapa.fecha_fin_programada)
  for (const [campo, valor] of [['fecha_inicio_programada', inicio], ['fecha_fin_programada', fin]]) {
    const f = aFechaDia(valor)
    if (!f) continue
    if (eInicio && f < eInicio) {
      throw new AppError(
        `La fecha no puede ser anterior al inicio de la etapa «${etapa.nombre}» (${eInicio})`,
        400,
        campo,
      )
    }
    if (eFin && f > eFin) {
      throw new AppError(
        `La fecha no puede ser posterior al fin de la etapa «${etapa.nombre}» (${eFin})`,
        400,
        campo,
      )
    }
  }
}

/** Dos rangos 'YYYY-MM-DD' (extremos incluidos) comparten al menos un día. */
export function rangosSeSolapan(inicioA, finA, inicioB, finB) {
  return inicioA <= finB && inicioB <= finA
}
