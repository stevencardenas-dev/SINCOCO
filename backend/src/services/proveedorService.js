import * as proveedorRepository from '../repositories/proveedorRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-13: catálogo de proveedores. Un proveedor es un actor externo del
 * negocio, no usuario del sistema.
 */
export async function listarProveedores({ incluirInactivos = false, buscar = '' } = {}) {
  return proveedorRepository.listar(incluirInactivos, String(buscar).trim())
}

export async function obtenerProveedor(id) {
  const proveedor = await proveedorRepository.findById(id)
  if (!proveedor) throw new AppError('Proveedor no encontrado', 404)
  return proveedor
}

/**
 * HU-13 criterio 4: solo un proveedor ACTIVO puede asociarse a nuevas órdenes
 * de compra o servicios externos. Las HU de órdenes y servicios (HU-28) deben
 * llamar a esta función antes de asociar.
 */
export async function exigirProveedorActivo(id) {
  const proveedor = await obtenerProveedor(id)
  if (!proveedor.activo || proveedor.estado !== 'ACTIVO') {
    throw new AppError(
      'El proveedor está inactivo y no puede asociarse a nuevas órdenes o servicios',
      409,
      'proveedor_id',
    )
  }
  return proveedor
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

export async function actualizarProveedor(id, dto, ctx = {}) {
  const actual = await obtenerProveedor(id)
  if (!actual.activo) throw new AppError('El proveedor está dado de baja; reactívelo antes de editarlo', 409)
  if (await proveedorRepository.findByDocumento(dto.documento_identificacion, Number(id))) {
    throw new AppError(
      'Ya existe un proveedor con ese documento de identificación',
      409,
      'documento_identificacion',
    )
  }
  await proveedorRepository.update(id, dto)
  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'proveedores',
    registroId: Number(id),
    detalles: { documento_identificacion: dto.documento_identificacion, razon_social: dto.razon_social },
    ip: ctx.ip,
  })
  return proveedorRepository.findById(id)
}

export async function darDeBajaProveedor(id, ctx = {}) {
  const proveedor = await obtenerProveedor(id)
  if (!proveedor.activo) throw new AppError('El proveedor ya estaba dado de baja', 409)
  if (!(await proveedorRepository.darDeBaja(id, ctx.usuarioId))) {
    throw new AppError('El proveedor ya estaba dado de baja', 409)
  }
  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'DAR_DE_BAJA',
    tabla: 'proveedores',
    registroId: Number(id),
    detalles: { documento_identificacion: proveedor.documento_identificacion },
    ip: ctx.ip,
  })
  return { id: Number(id), activo: 0, estado: 'INACTIVO' }
}

export async function reactivarProveedor(id, ctx = {}) {
  await obtenerProveedor(id)
  if (!(await proveedorRepository.reactivar(id))) {
    throw new AppError('El proveedor no está dado de baja', 409)
  }
  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'REACTIVAR',
    tabla: 'proveedores',
    registroId: Number(id),
    ip: ctx.ip,
  })
  return { id: Number(id), activo: 1, estado: 'ACTIVO' }
}

// --- Documentos de soporte (criterio 3) ---

export const TIPOS_DOCUMENTO = ['CERTIFICADO', 'POLIZA', 'CONTRATO', 'RUT', 'OTRO']
export const MIME_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg']
export const TAMANO_MAXIMO = 5 * 1024 * 1024

export async function listarDocumentos(proveedorId) {
  await obtenerProveedor(proveedorId)
  return proveedorRepository.listarDocumentos(proveedorId)
}

export async function adjuntarDocumento(proveedorId, { tipo, nombre, mime, contenido }, ctx = {}) {
  const proveedor = await obtenerProveedor(proveedorId)
  if (!proveedor.activo) {
    throw new AppError('El proveedor está dado de baja; reactívelo para adjuntar documentos', 409)
  }
  if (!TIPOS_DOCUMENTO.includes(tipo)) {
    throw new AppError(`Tipo de documento inválido. Use: ${TIPOS_DOCUMENTO.join(', ')}`, 400, 'tipo')
  }
  const nombreLimpio = String(nombre ?? '').trim().slice(0, 255)
  if (!nombreLimpio) throw new AppError('El nombre del archivo es obligatorio', 400, 'nombre')
  if (!MIME_PERMITIDOS.includes(mime)) {
    throw new AppError('Formato no permitido: solo PDF, PNG o JPG', 400, 'archivo')
  }
  if (!Buffer.isBuffer(contenido) || contenido.length === 0) {
    throw new AppError('El archivo está vacío', 400, 'archivo')
  }

  const id = await proveedorRepository.crearDocumento({
    proveedorId, tipo, nombre: nombreLimpio, mime, contenido, usuarioId: ctx.usuarioId,
  })
  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ADJUNTAR_DOCUMENTO',
    tabla: 'proveedor_documentos',
    registroId: id,
    detalles: { proveedor_id: Number(proveedorId), tipo, nombre_archivo: nombreLimpio },
    ip: ctx.ip,
  })
  return proveedorRepository.findDocumento(proveedorId, id)
}

export async function obtenerDocumento(proveedorId, documentoId) {
  const doc = await proveedorRepository.findDocumento(proveedorId, documentoId, true)
  if (!doc) throw new AppError('Documento no encontrado', 404)
  return doc
}

export async function eliminarDocumento(proveedorId, documentoId, ctx = {}) {
  const doc = await obtenerDocumento(proveedorId, documentoId)
  await proveedorRepository.eliminarDocumento(proveedorId, documentoId)
  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ELIMINAR_DOCUMENTO',
    tabla: 'proveedor_documentos',
    registroId: Number(documentoId),
    detalles: { proveedor_id: Number(proveedorId), tipo: doc.tipo, nombre_archivo: doc.nombre_archivo },
    ip: ctx.ip,
  })
}
