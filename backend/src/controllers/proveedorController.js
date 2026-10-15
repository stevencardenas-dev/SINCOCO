import { listarProveedores, registrarProveedor } from '../services/proveedorService.js'
import { RegistrarProveedorDto } from '../dtos/proveedor/RegistrarProveedorDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * GET /api/proveedores -> HU-13: catálogo de proveedores.
 */
export const listar = asyncHandler(async (req, res) => {
  const incluirInactivos = ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))
  return res.json(await listarProveedores({ incluirInactivos }))
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
