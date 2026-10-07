import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo } from '../../utils/campos.js'

/**
 * DTO para reprogramar una etapa o una actividad (HU-34).
 *  - Criterio 2: el motivo es obligatorio.
 *  - Las dos fechas nuevas son obligatorias: reprogramar es fijar el nuevo rango
 *    completo, no corregir un solo extremo.
 */
export class ReprogramarDto {
  constructor({ motivo, fecha_inicio_programada, fecha_fin_programada }) {
    this.motivo = motivo
    this.fecha_inicio_programada = fecha_inicio_programada
    this.fecha_fin_programada = fecha_fin_programada
  }

  static fromRequestBody(body = {}) {
    const motivo = String(body.motivo ?? '').trim()
    if (!motivo) throw new AppError('El motivo de la reprogramación es obligatorio', 400, 'motivo')
    revisarLargo(motivo, LARGO.motivo_reprogramacion, 'motivo')

    const fechas = {}
    for (const campo of ['fecha_inicio_programada', 'fecha_fin_programada']) {
      if (!body[campo] || Number.isNaN(Date.parse(body[campo]))) {
        throw new AppError(`${campo} debe ser una fecha válida`, 400, campo)
      }
      fechas[campo] = String(body[campo]).slice(0, 10)
    }
    return new ReprogramarDto({ motivo, ...fechas })
  }
}
