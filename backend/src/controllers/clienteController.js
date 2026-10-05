import {
  listarClientes,
  registrarCliente,
  actualizarCliente,
  darDeBajaCliente,
  reactivarCliente,
} from '../services/clienteService.js'
import { RegistrarClienteDto } from '../dtos/cliente/RegistrarClienteDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * GET /api/clientes -> catálogo para el formulario de CU-02.
 */
export const listar = asyncHandler(async (req, res) => {
  const incluirInactivos = ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))
  return res.json(await listarClientes({ incluirInactivos }))
})

/**
 * POST /api/clientes -> HU-02 · CU-02 Alt 2: registrar el cliente que aún no
 * existe para poder asociarlo al proyecto.
 */
export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarClienteDto.fromRequestBody(req.body)
  const cliente = await registrarCliente(dto, contexto(req))
  return res.status(201).json({ message: 'Cliente registrado correctamente', cliente })
})

/** PATCH /api/clientes/:id -> editar la ficha desde Gestión Administrativa. */
export const actualizar = asyncHandler(async (req, res) => {
  const cliente = await actualizarCliente(req.params.id, req.body, contexto(req))
  return res.json({ message: 'Cliente actualizado', cliente })
})

/** PATCH /api/clientes/:id/baja -> HU-18: baja lógica, nunca borrado físico. */
export const baja = asyncHandler(async (req, res) => {
  const resultado = await darDeBajaCliente(req.params.id, contexto(req))
  return res.json({ message: 'Cliente dado de baja', ...resultado })
})

/** PATCH /api/clientes/:id/reactivar -> HU-18. */
export const reactivarCtrl = asyncHandler(async (req, res) => {
  const resultado = await reactivarCliente(req.params.id, contexto(req))
  return res.json({ message: 'Cliente reactivado', ...resultado })
})
