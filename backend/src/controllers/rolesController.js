import * as rolesService from '../services/rolesService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** GET /api/roles/permisos -> matriz de roles y permisos. */
export const matrizRolesPermisos = asyncHandler(async (req, res) => {
  res.json(await rolesService.matrizRolesPermisos())
})

/** POST /api/roles -> crear un rol nuevo (nace sin permisos). */
export const crearRol = asyncHandler(async (req, res) => {
  const rol = await rolesService.crearRol(req.body, contexto(req))
  return res.status(201).json({ message: 'Rol creado', rol })
})

/** PATCH /api/roles/:id -> editar nombre y descripción del rol. */
export const actualizarRol = asyncHandler(async (req, res) => {
  const rol = await rolesService.actualizarRol(req.params.id, req.body, contexto(req))
  return res.json({ message: 'Rol actualizado', rol })
})

/** DELETE /api/roles/:id -> eliminar un rol (solo si nadie lo tiene asignado). */
export const eliminarRol = asyncHandler(async (req, res) => {
  return res.json(await rolesService.eliminarRol(req.params.id, contexto(req)))
})

/** PUT /api/roles/:id/permisos -> reemplaza el conjunto de permisos del rol. */
export const asignarPermisos = asyncHandler(async (req, res) => {
  return res.json(await rolesService.asignarPermisos(req.params.id, req.body, contexto(req)))
})
