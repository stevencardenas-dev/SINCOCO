import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo } from '../../utils/campos.js'

/**
 * DTO para reprogramar una etapa o una actividad (HU-34).
 *  - Criterio 2: el motivo es obligatorio.
 *  - Criterio 4: `confirmar` es la aceptación explícita de extender también el fin
 *    del proyecto cuando el recálculo lo excede; sin ella el sistema solo advierte.
 *  - Las dos fechas nuevas son obligatorias: reprogramar es fijar el nuevo rango
 *    completo, no corregir un solo extremo.
 */
export class ReprogramarDto {
  constructor({ motivo, fecha_inicio_programada, fecha_fin_programada, confirmar, autorizado_por_usuario_id = null }) {
    this.motivo = motivo
    // Quién autorizó el cambio (opcional): si no llega, el service usa al usuario que registra.
    this.autorizado_por_usuario_id = autorizado_por_usuario_id
    this.confirmar = confirmar
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
    // Solo `true` (o 'true') confirma: cualquier otro valor cuenta como no confirmado.
    const confirmar = body.confirmar === true || body.confirmar === 'true'
    let autorizado_por_usuario_id = null
    const autorizado = body.autorizado_por_usuario_id
    if (autorizado !== undefined && autorizado !== null && autorizado !== '') {
      autorizado_por_usuario_id = Number(autorizado)
      if (!Number.isInteger(autorizado_por_usuario_id) || autorizado_por_usuario_id <= 0) {
        throw new AppError('autorizado_por_usuario_id debe ser el id de un usuario', 400, 'autorizado_por_usuario_id')
      }
    }
    return new ReprogramarDto({ motivo, ...fechas, confirmar, autorizado_por_usuario_id })
  }
}
