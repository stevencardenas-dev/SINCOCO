import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo, textoOpcional } from '../../utils/campos.js'

export const TIPOS_INCIDENCIA = ['AVERIA', 'ACCIDENTE', 'RETRASO']
export const SEVERIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

/**
 * DTO para registrar una incidencia de obra (HU-14).
 *  - Criterio 1: proyecto_id, título, descripción y severidad son obligatorios
 *    (el tipo también: avería, accidente o retraso).
 *  - Criterio 2: `actividad_id` es opcional; el servicio comprueba que pertenezca
 *    al proyecto.
 */
export class RegistrarIncidenciaDto {
  constructor({ proyecto_id, actividad_id, tipo, titulo, descripcion, severidad, evidencia }) {
    this.proyecto_id = proyecto_id
    this.actividad_id = actividad_id
    this.tipo = tipo
    this.titulo = titulo
    this.descripcion = descripcion
    this.severidad = severidad
    this.evidencia = evidencia
  }

  static fromRequestBody(body = {}) {
    const proyecto_id = Number(body.proyecto_id)
    if (!Number.isInteger(proyecto_id) || proyecto_id <= 0) {
      throw new AppError('El proyecto es obligatorio', 400, 'proyecto_id')
    }

    let actividad_id = null
    if (body.actividad_id !== undefined && body.actividad_id !== null && body.actividad_id !== '') {
      actividad_id = Number(body.actividad_id)
      if (!Number.isInteger(actividad_id) || actividad_id <= 0) {
        throw new AppError('La actividad indicada no es válida', 400, 'actividad_id')
      }
    }

    const tipo = String(body.tipo ?? '').trim().toUpperCase()
    if (!TIPOS_INCIDENCIA.includes(tipo)) {
      throw new AppError(`El tipo debe ser uno de: ${TIPOS_INCIDENCIA.join(', ')}`, 400, 'tipo')
    }

    const titulo = String(body.titulo ?? '').trim()
    if (!titulo) throw new AppError('El título es obligatorio', 400, 'titulo')
    revisarLargo(titulo, LARGO.titulo_incidencia, 'titulo')

    const descripcion = String(body.descripcion ?? '').trim()
    if (!descripcion) throw new AppError('La descripción es obligatoria', 400, 'descripcion')
    revisarLargo(descripcion, LARGO.texto_largo, 'descripcion')

    const severidad = String(body.severidad ?? '').trim().toUpperCase()
    if (!SEVERIDADES.includes(severidad)) {
      throw new AppError(`La severidad debe ser una de: ${SEVERIDADES.join(', ')}`, 400, 'severidad')
    }

    const evidencia = textoOpcional(body.evidencia)
    revisarLargo(evidencia, LARGO.evidencia_incidencia, 'evidencia')

    return new RegistrarIncidenciaDto({ proyecto_id, actividad_id, tipo, titulo, descripcion, severidad, evidencia })
  }
}
