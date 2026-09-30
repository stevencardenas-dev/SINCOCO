import {
  listarClientes,
  registrarCliente,
  actualizarCliente,
  darDeBajaCliente,
  reactivarCliente,
} from '../services/clienteService.js'
import { RegistrarClienteDto } from '../dtos/cliente/RegistrarClienteDto.js'

/**
 * GET /api/clientes -> catálogo para el formulario de CU-02.
 */
export async function listar(req, res, next) {
  try {
    const incluirInactivos = ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))
    return res.json(await listarClientes({ incluirInactivos }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/clientes -> HU-02 · CU-02 Alt 2: registrar el cliente que aún no
 * existe para poder asociarlo al proyecto.
 */
export async function registrar(req, res, next) {
  try {
    const dto = RegistrarClienteDto.fromRequestBody(req.body)
    const cliente = await registrarCliente(dto, { usuarioId: req.user.id, ip: req.ip })
    return res.status(201).json({ message: 'Cliente registrado correctamente', cliente })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/clientes/:id -> editar la ficha desde la pantalla de Catálogo. */
export async function actualizar(req, res, next) {
  try {
    const cliente = await actualizarCliente(req.params.id, req.body, {
      usuarioId: req.user.id,
      ip: req.ip,
    })
    return res.json({ message: 'Cliente actualizado', cliente })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/clientes/:id/baja -> HU-18: baja lógica, nunca borrado físico. */
export async function baja(req, res, next) {
  try {
    const resultado = await darDeBajaCliente(req.params.id, {
      usuarioId: req.user.id,
      ip: req.ip,
    })
    return res.json({ message: 'Cliente dado de baja', ...resultado })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/clientes/:id/reactivar -> HU-18. */
export async function reactivarCtrl(req, res, next) {
  try {
    const resultado = await reactivarCliente(req.params.id, {
      usuarioId: req.user.id,
      ip: req.ip,
    })
    return res.json({ message: 'Cliente reactivado', ...resultado })
  } catch (error) {
    return next(error)
  }
}
