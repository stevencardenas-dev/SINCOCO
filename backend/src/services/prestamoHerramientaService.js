import * as repo from '../repositories/prestamoHerramientaRepository.js'
import { AppError } from '../utils/AppError.js'

export const ESTADOS_PRESTAMO = ['ACTIVO', 'DEVUELTO', 'ATRASADO', 'CON_NOVEDAD']

/** HU-11: consulta de préstamos (aún sin registrar entregas ni devoluciones). */
export async function listarPrestamos({ estado = '' } = {}) {
  const e = String(estado ?? '').trim().toUpperCase()
  if (e && !ESTADOS_PRESTAMO.includes(e)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS_PRESTAMO.join(', ')}`, 400, 'estado')
  }
  return repo.listar({ estado: e })
}
