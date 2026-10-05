import * as usuariosService from '../services/usuariosService.js'
import { listarSolicitudesPendientes } from '../services/resetService.js'
import { asyncHandler, contexto } from '../utils/http.js'

// HU-01: crear usuario con rol asignado
export const crear = asyncHandler(async (req, res) => {
  const usuario = await usuariosService.crearUsuario(req.body, contexto(req))
  res.status(201).json(usuario)
})

// Editar los datos de la cuenta: nombre de usuario y correo empresarial.
export const editar = asyncHandler(async (req, res) => {
  res.json(await usuariosService.editarUsuario(req.params.id, req.body, contexto(req)))
})

/**
 * GET /api/usuarios/solicitudes-reset -> códigos de recuperación pendientes.
 *
 * El sistema no envía correo: el administrador es quien entrega el código, así
 * que necesita verlo aquí junto con el usuario que lo pidió (HU-01).
 */
export const listarSolicitudesReset = asyncHandler(async (req, res) => {
  return res.json(await listarSolicitudesPendientes())
})

// HU-01: listar usuarios. HU-18: ?incluirInactivos=1 trae los archivados.
export const listar = asyncHandler(async (req, res) => {
  const incluirInactivos = ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))
  res.json(await usuariosService.listarUsuarios({ incluirInactivos }))
})

// HU-18: dar de baja lógica una cuenta.
export const baja = asyncHandler(async (req, res) => {
  res.json(await usuariosService.darDeBajaUsuario(req.params.id, contexto(req)))
})

// HU-18: reactivar una cuenta dada de baja.
export const reactivarCtrl = asyncHandler(async (req, res) => {
  res.json(await usuariosService.reactivarUsuario(req.params.id, contexto(req)))
})

// CU-01 precondición: lista de roles para que el administrador elija.
export const listarRoles = asyncHandler(async (req, res) => {
  res.json(await usuariosService.listarRoles())
})

// CU-01 criterio 1: trabajadores activos y sin cuenta.
export const listarTrabajadoresSinCuenta = asyncHandler(async (req, res) => {
  res.json(await usuariosService.listarTrabajadoresSinCuenta())
})

// CU-01 Alt 3: cambiar el rol de un usuario existente.
export const cambiarRol = asyncHandler(async (req, res) => {
  res.json(await usuariosService.cambiarRol(req.params.id, req.body, contexto(req)))
})

// HU-01: activar o bloquear un usuario
export const cambiarEstado = asyncHandler(async (req, res) => {
  res.json(await usuariosService.cambiarEstado(req.params.id, req.body, contexto(req)))
})
