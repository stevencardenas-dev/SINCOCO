import * as repo from '../repositories/salidaMaterialRepository.js'
import { existenciasPorAlmacen as existencias } from '../repositories/existenciaAlmacenRepository.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-26: consulta de las salidas efectivas de materiales (constancia de lo despachado) y de la existencia por almacén.
 * Las salidas las crea el despacho de una solicitud aprobada (HU-08), que valida la existencia del almacén de origen.
 */
export const listarSalidas = () => repo.listar()
export const existenciasPorAlmacen = () => existencias()

export async function obtenerSalida(id) {
  const salida = await repo.findById(id)
  if (!salida) throw new AppError('Salida no encontrada', 404)
  return salida
}
