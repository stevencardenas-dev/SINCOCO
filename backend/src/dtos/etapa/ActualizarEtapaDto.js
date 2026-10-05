import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo } from '../../utils/campos.js'
import { textoOpcional } from '../trabajador/RegistrarTrabajadorDto.js'

/** DTO para editar una etapa: solo viajan los campos que se quieren cambiar. */
export class ActualizarEtapaDto {
  constructor(campos) {
    this.campos = campos
  }

  static fromRequestBody(body = {}) {
    const campos = {}

    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim()
      if (!nombre) throw new AppError('El nombre de la etapa es obligatorio', 400, 'nombre')
      revisarLargo(nombre, LARGO.nombre_etapa, 'nombre')
      campos.nombre = nombre
    }
    if (body.descripcion !== undefined) {
      revisarLargo(textoOpcional(body.descripcion), LARGO.texto_largo, 'descripcion')
      campos.descripcion = textoOpcional(body.descripcion)
    }
    for (const campo of ['fecha_inicio_programada', 'fecha_fin_programada']) {
      if (body[campo] === undefined) continue
      if (!body[campo] || Number.isNaN(Date.parse(body[campo]))) {
        throw new AppError(`${campo} debe ser una fecha válida`, 400, campo)
      }
      campos[campo] = String(body[campo]).slice(0, 10)
    }

    if (Object.keys(campos).length === 0) throw new AppError('No hay campos que actualizar', 400)
    return new ActualizarEtapaDto(campos)
  }
}
