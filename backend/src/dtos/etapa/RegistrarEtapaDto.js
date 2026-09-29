import { AppError } from '../../utils/AppError.js'
import { textoOpcional } from '../trabajador/RegistrarTrabajadorDto.js'

/** DTO para definir una etapa del plan de trabajo (HU-03). */
export class RegistrarEtapaDto {
  constructor({ proyecto_id, nombre, descripcion, orden, fecha_inicio_programada, fecha_fin_programada }) {
    this.proyecto_id = proyecto_id
    this.nombre = nombre
    this.descripcion = descripcion
    this.orden = orden
    this.fecha_inicio_programada = fecha_inicio_programada
    this.fecha_fin_programada = fecha_fin_programada
  }

  static fromRequestBody(body = {}) {
    const faltantes = ['proyecto_id', 'nombre'].filter(
      (c) => body[c] === undefined || body[c] === null || String(body[c]).trim() === '',
    )
    if (faltantes.length > 0) {
      throw new AppError(`Faltan campos obligatorios: ${faltantes.join(', ')}`, 400)
    }
    if (Number.isNaN(Number(body.proyecto_id))) {
      throw new AppError('proyecto_id debe ser numérico', 400, 'proyecto_id')
    }
    for (const campo of ['fecha_inicio_programada', 'fecha_fin_programada']) {
      if (body[campo] && Number.isNaN(Date.parse(body[campo]))) {
        throw new AppError(`${campo} debe ser una fecha válida`, 400, campo)
      }
    }
    // El orden es la secuencia de la etapa dentro del plan: solo admite enteros
    // desde 1. La UI lo limita con min=1 y step=1, pero la API se puede llamar
    // directamente (RNF04), así que el rango se valida también aquí.
    if (body.orden !== undefined && body.orden !== '') {
      const orden = Number(body.orden)
      if (!Number.isInteger(orden) || orden < 1) {
        throw new AppError('orden debe ser un número entero mayor o igual a 1', 400, 'orden')
      }
    }

    return new RegistrarEtapaDto({
      proyecto_id: Number(body.proyecto_id),
      nombre: String(body.nombre).trim(),
      descripcion: textoOpcional(body.descripcion),
      orden: body.orden === undefined || body.orden === '' ? null : Number(body.orden),
      fecha_inicio_programada: textoOpcional(body.fecha_inicio_programada),
      fecha_fin_programada: textoOpcional(body.fecha_fin_programada),
    })
  }
}
