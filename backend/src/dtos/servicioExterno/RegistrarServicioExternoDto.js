import { AppError } from '../../utils/AppError.js'
import { LARGO, revisarLargo, textoOpcional, montoOpcional } from '../../utils/campos.js'

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/
const ESTADOS_INICIALES = ['PROGRAMADO', 'EN_EJECUCION']
const vacio = (v) => v === undefined || v === null || String(v).trim() === ''

function id(valor, campo, etiqueta) {
  if (vacio(valor)) throw new AppError(`${etiqueta} es obligatorio`, 400, campo)
  const n = Number(valor)
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`${campo} debe ser un identificador válido`, 400, campo)
  return n
}

function fecha(valor, campo, etiqueta) {
  if (vacio(valor)) throw new AppError(`${etiqueta} es obligatoria`, 400, campo)
  const texto = String(valor).trim().slice(0, 10)
  if (!FORMATO_FECHA.test(texto) || Number.isNaN(Date.parse(texto))) {
    throw new AppError(`${campo} debe ser una fecha válida (AAAA-MM-DD)`, 400, campo)
  }
  return texto
}

/**
 * DTO para registrar un servicio externo contratado (HU-28).
 * Criterio 1: proveedor, proyecto y actividad obligatorios. Criterio 2: fechas
 * de inicio y fin y valor contratado obligatorios. `confirmar_exceso` es la
 * respuesta del administrador a la advertencia de presupuesto excedido.
 */
export class RegistrarServicioExternoDto {
  static fromRequestBody(body = {}) {
    const dto = new RegistrarServicioExternoDto()
    dto.proveedor_id = id(body.proveedor_id, 'proveedor_id', 'El proveedor')
    dto.proyecto_id = id(body.proyecto_id, 'proyecto_id', 'El proyecto')
    dto.actividad_id = id(body.actividad_id, 'actividad_id', 'La actividad')

    dto.nombre_servicio = textoOpcional(body.nombre_servicio)
    if (!dto.nombre_servicio) throw new AppError('El nombre del servicio es obligatorio', 400, 'nombre_servicio')
    dto.responsable_externo = textoOpcional(body.responsable_externo)
    if (!dto.responsable_externo) throw new AppError('El responsable externo es obligatorio', 400, 'responsable_externo')
    dto.descripcion = textoOpcional(body.descripcion)
    dto.observaciones = textoOpcional(body.observaciones)
    revisarLargo(dto.nombre_servicio, LARGO.nombre_servicio, 'nombre_servicio')
    revisarLargo(dto.responsable_externo, LARGO.responsable_externo, 'responsable_externo')
    revisarLargo(dto.descripcion, LARGO.texto_largo, 'descripcion')
    revisarLargo(dto.observaciones, LARGO.texto_largo, 'observaciones')

    dto.fecha_inicio = fecha(body.fecha_inicio, 'fecha_inicio', 'La fecha de inicio')
    dto.fecha_fin = fecha(body.fecha_fin, 'fecha_fin', 'La fecha de fin')

    dto.valor_contratado = montoOpcional(body.valor_contratado, 'valor_contratado')
    if (dto.valor_contratado === null) throw new AppError('El valor contratado es obligatorio', 400, 'valor_contratado')

    dto.estado = vacio(body.estado) ? 'PROGRAMADO' : String(body.estado).toUpperCase()
    if (!ESTADOS_INICIALES.includes(dto.estado)) {
      throw new AppError(`El estado inicial debe ser uno de: ${ESTADOS_INICIALES.join(', ')}`, 400, 'estado')
    }
    dto.confirmar_exceso = body.confirmar_exceso === true || body.confirmar_exceso === 'true'
    return dto
  }
}
