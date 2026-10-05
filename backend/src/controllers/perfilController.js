import { obtenerPerfil, actualizarPerfil } from '../services/perfilService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * Información personal de quien está conectado (`/api/perfil`).
 *
 * A diferencia del resto de módulos, aquí no hay `requirePermiso`: cualquier
 * usuario autenticado administra sus propios datos, sean del rol que sean. La
 * cuenta sale del token, nunca del cuerpo de la petición.
 */

/** GET /api/perfil -> datos de la cuenta y de la ficha de trabajador. */
export const obtener = asyncHandler(async (req, res) => {
  return res.json(await obtenerPerfil(req.user.id))
})

/** PATCH /api/perfil -> actualizar teléfono, correo, dirección y contraseña. */
export const actualizar = asyncHandler(async (req, res) => {
  const perfil = await actualizarPerfil(req.user.id, req.body, contexto(req))
  return res.json({ message: 'Información actualizada', ...perfil })
})
