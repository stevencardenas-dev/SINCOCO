import {
  listarProveedores,
  registrarProveedor,
  obtenerProveedor,
  actualizarProveedor,
  darDeBajaProveedor,
  reactivarProveedor,
  listarDocumentos,
  adjuntarDocumento,
  obtenerDocumento,
  eliminarDocumento,
} from '../services/proveedorService.js'
import { RegistrarProveedorDto } from '../dtos/proveedor/RegistrarProveedorDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * GET /api/proveedores -> HU-13: catálogo de proveedores.
 * `?buscar=` filtra por NIT, razón social o contacto; `?incluirInactivos=1`
 * incluye los dados de baja.
 */
export const listar = asyncHandler(async (req, res) => {
  const incluirInactivos = ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))
  return res.json(await listarProveedores({ incluirInactivos, buscar: req.query.buscar ?? '' }))
})

export const obtener = asyncHandler(async (req, res) => {
  return res.json(await obtenerProveedor(req.params.id))
})

/**
 * POST /api/proveedores -> HU-13: registrar un proveedor con su documento
 * único y sus datos de contacto.
 */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarProveedorDto.fromRequestBody(req.body)
  const proveedor = await registrarProveedor(dto, contexto(req))
  return res.status(201).json({ message: 'Proveedor registrado correctamente', proveedor })
})

export const actualizar = asyncHandler(async (req, res) => {
  const dto = RegistrarProveedorDto.fromRequestBody(req.body)
  const proveedor = await actualizarProveedor(req.params.id, dto, contexto(req))
  return res.json({ message: 'Proveedor actualizado correctamente', proveedor })
})

export const baja = asyncHandler(async (req, res) => {
  const resultado = await darDeBajaProveedor(req.params.id, contexto(req))
  return res.json({ message: 'Proveedor dado de baja', ...resultado })
})

export const reactivarCtrl = asyncHandler(async (req, res) => {
  const resultado = await reactivarProveedor(req.params.id, contexto(req))
  return res.json({ message: 'Proveedor reactivado', ...resultado })
})

// --- Documentos de soporte (criterio 3) ---

export const documentos = asyncHandler(async (req, res) => {
  return res.json(await listarDocumentos(req.params.id))
})

/**
 * POST /api/proveedores/:id/documentos?tipo=&nombre= con el archivo como
 * cuerpo crudo (Content-Type = el del archivo: PDF, PNG o JPG).
 */
export const adjuntar = asyncHandler(async (req, res) => {
  const documento = await adjuntarDocumento(
    req.params.id,
    {
      tipo: String(req.query.tipo ?? '').toUpperCase(),
      nombre: req.query.nombre,
      mime: req.headers['content-type']?.split(';')[0],
      contenido: req.body,
    },
    contexto(req),
  )
  return res.status(201).json({ message: 'Documento adjuntado correctamente', documento })
})

export const descargar = asyncHandler(async (req, res) => {
  const doc = await obtenerDocumento(req.params.id, req.params.docId)
  res.set('Content-Type', doc.tipo_mime)
  res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(doc.nombre_archivo)}`)
  return res.send(doc.contenido)
})

export const eliminar = asyncHandler(async (req, res) => {
  await eliminarDocumento(req.params.id, req.params.docId, contexto(req))
  return res.json({ message: 'Documento eliminado' })
})
