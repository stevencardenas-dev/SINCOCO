import { AppError } from '../../utils/AppError.js'
import { textoOpcional } from '../trabajador/RegistrarTrabajadorDto.js'

/** DTO para asignar personal a un proyecto o a una de sus actividades. */
export class RegistrarAsignacionDto {
  constructor({
    trabajador_id,
    proyecto_id,
    actividad_id,
    fecha_inicio,
    fecha_fin_programada,
    rol_en_proyecto,
    observaciones,
  }) {
    this.trabajador_id = trabajador_id
    this.proyecto_id = proyecto_id
    this.actividad_id = actividad_id
    this.fecha_inicio = fecha_inicio
    this.fecha_fin_programada = fecha_fin_programada
    this.rol_en_proyecto = rol_en_proyecto
    this.observaciones = observaciones
  }

  static fromRequestBody(body = {}) {
    const faltantes = ['trabajador_id', 'proyecto_id', 'fecha_inicio'].filter(
      (c) => body[c] === undefined || body[c] === null || String(body[c]).trim() === '',
    )
    if (faltantes.length > 0) {
      throw new AppError(`Faltan campos obligatorios: ${faltantes.join(', ')}`, 400)
    }
    for (const campo of ['trabajador_id', 'proyecto_id']) {
      if (Number.isNaN(Number(body[campo]))) {
        throw new AppError(`${campo} debe ser numérico`, 400, campo)
      }
    }
    if (body.actividad_id !== undefined && body.actividad_id !== '' && Number.isNaN(Number(body.actividad_id))) {
      throw new AppError('actividad_id debe ser numérico', 400, 'actividad_id')
    }
    for (const campo of ['fecha_inicio', 'fecha_fin_programada']) {
      if (body[campo] !== undefined && body[campo] !== null && body[campo] !== ''
          && Number.isNaN(Date.parse(body[campo]))) {
        throw new AppError(`${campo} debe ser una fecha válida`, 400, campo)
      }
    }

    return new RegistrarAsignacionDto({
      trabajador_id: Number(body.trabajador_id),
      proyecto_id: Number(body.proyecto_id),
      actividad_id:
        body.actividad_id === undefined || body.actividad_id === ''
          ? null
          : Number(body.actividad_id),
      fecha_inicio: body.fecha_inicio,
      fecha_fin_programada: textoOpcional(body.fecha_fin_programada),
      rol_en_proyecto: textoOpcional(body.rol_en_proyecto),
      observaciones: textoOpcional(body.observaciones),
    })
  }
}
