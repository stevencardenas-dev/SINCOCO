import * as clienteRepository from '../repositories/clienteRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-02 · CU-02 Alt 2: catálogo de clientes que alimenta el formulario de
 * registro de proyecto. Un cliente es actor del negocio, no usuario del
 * sistema, así que no pasa por el módulo de usuarios.
 */
export async function listarClientes() {
  return clienteRepository.listarActivos()
}

/**
 * Registra un cliente nuevo. `numero_documento` es UNIQUE en el esquema:
 * si ya existe se responde 409 señalando el campo en conflicto.
 */
export async function registrarCliente(dto, ctx = {}) {
  const existente = await clienteRepository.findByDocumento(dto.numero_documento)
  if (existente) {
    throw new AppError('Ya existe un cliente con ese número de documento', 409, 'numero_documento')
  }

  const id = await clienteRepository.create(dto)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'clientes',
    registroId: id,
    detalles: { numero_documento: dto.numero_documento, razon_social_nombre: dto.razon_social_nombre },
    ip: ctx.ip,
  })

  return clienteRepository.findById(id)
}
