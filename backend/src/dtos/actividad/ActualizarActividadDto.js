import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo, textoOpcional, revisarPeso } from '../../utils/campos.js'

/** DTO para editar una actividad: solo viajan los campos que se quieren cambiar. */
export class ActualizarActividadDto {
  constructor(campos) {
    this.campos = campos
  }

  static fromRequestBody(body = {}) {
    const campos = {}

    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim()
      if (!nombre) throw new AppError('El nombre de la actividad es obligatorio', 400, 'nombre')
      revisarLargo(nombre, LARGO.nombre_actividad, 'nombre')
      campos.nombre = nombre
    }
    if (body.descripcion !== undefined) {
      revisarLargo(textoOpcional(body.descripcion), LARGO.texto_largo, 'descripcion')
      campos.descripcion = textoOpcional(body.descripcion)
    }
    if (body.responsable_id !== undefined) {
      if (body.responsable_id === '' || body.responsable_id === null) {
        campos.responsable_id = null
      } else if (Number.isNaN(Number(body.responsable_id))) {
        throw new AppError('responsable_id debe ser numérico', 400, 'responsable_id')
      } else {
        campos.responsable_id = Number(body.responsable_id)
      }
    }
    for (const campo of ['fecha_inicio_programada', 'fecha_fin_programada']) {
      if (body[campo] === undefined) continue
      if (!body[campo] || Number.isNaN(Date.parse(body[campo]))) {
        throw new AppError(`${campo} debe ser una fecha válida`, 400, campo)
      }
      campos[campo] = String(body[campo]).slice(0, 10)
    }

    if (body.peso !== undefined) campos.peso = revisarPeso(body.peso)

    if (Object.keys(campos).length === 0) throw new AppError('No hay campos que actualizar', 400)
    return new ActualizarActividadDto(campos)
  }
}
