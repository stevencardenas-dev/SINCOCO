import { listarClientes, registrarCliente } from '../services/clienteService.js'
import { RegistrarClienteDto } from '../dtos/cliente/RegistrarClienteDto.js'

/**
 * GET /api/clientes -> catálogo para el formulario de CU-02.
 */
export async function listar(req, res, next) {
  try {
    return res.json(await listarClientes())
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
