import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo } from '../../utils/campos.js'
import { textoOpcional } from '../trabajador/RegistrarTrabajadorDto.js'

/**
 * DTO para definir una etapa del plan de trabajo (HU-03). Las fechas son
 * obligatorias (con ellas se valida el solape y se calcula el orden); el `orden`
 * lo asigna el sistema.
 */
export class RegistrarEtapaDto {
  constructor({ proyecto_id, nombre, descripcion, fecha_inicio_programada, fecha_fin_programada }) {
    this.proyecto_id = proyecto_id
    this.nombre = nombre
    this.descripcion = descripcion
    this.fecha_inicio_programada = fecha_inicio_programada
    this.fecha_fin_programada = fecha_fin_programada
  }

  static fromRequestBody(body = {}) {
    const faltantes = ['proyecto_id', 'nombre', 'fecha_inicio_programada', 'fecha_fin_programada'].filter(
      (c) => body[c] === undefined || body[c] === null || String(body[c]).trim() === '',
    )
    if (faltantes.length > 0) {
      throw new AppError(`Faltan campos obligatorios: ${faltantes.join(', ')}`, 400)
    }
    if (Number.isNaN(Number(body.proyecto_id))) {
      throw new AppError('proyecto_id debe ser numérico', 400, 'proyecto_id')
    }
    for (const campo of ['fecha_inicio_programada', 'fecha_fin_programada']) {
      if (Number.isNaN(Date.parse(body[campo]))) {
        throw new AppError(`${campo} debe ser una fecha válida`, 400, campo)
      }
    }
    revisarLargo(String(body.nombre).trim(), LARGO.nombre_etapa, 'nombre')
    revisarLargo(textoOpcional(body.descripcion), LARGO.texto_largo, 'descripcion')

    return new RegistrarEtapaDto({
      proyecto_id: Number(body.proyecto_id),
      nombre: String(body.nombre).trim(),
      descripcion: textoOpcional(body.descripcion),
      fecha_inicio_programada: textoOpcional(body.fecha_inicio_programada),
      fecha_fin_programada: textoOpcional(body.fecha_fin_programada),
    })
  }
}
