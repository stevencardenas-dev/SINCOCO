import * as proveedorRepository from '../repositories/proveedorRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-13: catálogo de proveedores. Un proveedor es un actor externo del
 * negocio, no usuario del sistema.
 */
export async function listarProveedores({ incluirInactivos = false } = {}) {
  return proveedorRepository.listar(incluirInactivos)
}

/**
 * Registra un proveedor nuevo. `documento_identificacion` es UNIQUE en el
 * esquema: si ya existe se responde 409 señalando el campo en conflicto.
 */
export async function registrarProveedor(dto, ctx = {}) {
  const existente = await proveedorRepository.findByDocumento(dto.documento_identificacion)
  if (existente) {
    throw new AppError(
      'Ya existe un proveedor con ese documento de identificación',
      409,
      'documento_identificacion',
    )
  }

  const id = await proveedorRepository.create(dto)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'proveedores',
    registroId: id,
    detalles: {
      documento_identificacion: dto.documento_identificacion,
      razon_social: dto.razon_social,
    },
    ip: ctx.ip,
  })

  return proveedorRepository.findById(id)
}
