import { AppError } from '../../utils/AppError.js'
import { textoOpcional } from '../trabajador/RegistrarTrabajadorDto.js'

/** DTO para definir una actividad del plan de trabajo (HU-03). */
export class RegistrarActividadDto {
  constructor({
    etapa_id,
    responsable_id,
    nombre,
    descripcion,
    fecha_inicio_programada,
    fecha_fin_programada,
  }) {
    this.etapa_id = etapa_id
    this.responsable_id = responsable_id
    this.nombre = nombre
    this.descripcion = descripcion
    this.fecha_inicio_programada = fecha_inicio_programada
    this.fecha_fin_programada = fecha_fin_programada
  }

  static fromRequestBody(body = {}) {
    const faltantes = ['etapa_id', 'nombre', 'fecha_inicio_programada', 'fecha_fin_programada'].filter(
      (c) => body[c] === undefined || body[c] === null || String(body[c]).trim() === '',
    )
    if (faltantes.length > 0) {
      throw new AppError(`Faltan campos obligatorios: ${faltantes.join(', ')}`, 400)
    }
    if (Number.isNaN(Number(body.etapa_id))) {
      throw new AppError('etapa_id debe ser numérico', 400, 'etapa_id')
    }
    if (body.responsable_id !== undefined && body.responsable_id !== '' && Number.isNaN(Number(body.responsable_id))) {
      throw new AppError('responsable_id debe ser numérico', 400, 'responsable_id')
    }
    for (const campo of ['fecha_inicio_programada', 'fecha_fin_programada']) {
      if (Number.isNaN(Date.parse(body[campo]))) {
        throw new AppError(`${campo} debe ser una fecha válida`, 400, campo)
      }
    }

    return new RegistrarActividadDto({
      etapa_id: Number(body.etapa_id),
      responsable_id:
        body.responsable_id === undefined || body.responsable_id === ''
          ? null
          : Number(body.responsable_id),
      nombre: String(body.nombre).trim(),
      descripcion: textoOpcional(body.descripcion),
      fecha_inicio_programada: body.fecha_inicio_programada,
      fecha_fin_programada: body.fecha_fin_programada,
    })
  }
}
