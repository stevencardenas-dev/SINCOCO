import { obtenerPerfil, actualizarPerfil } from '../services/perfilService.js'

/**
 * Información personal de quien está conectado (`/api/perfil`).
 *
 * A diferencia del resto de módulos, aquí no hay `requirePermiso`: cualquier
 * usuario autenticado administra sus propios datos, sean del rol que sean. La
 * cuenta sale del token, nunca del cuerpo de la petición.
 */

/** GET /api/perfil -> datos de la cuenta y de la ficha de trabajador. */
export async function obtener(req, res, next) {
  try {
    return res.json(await obtenerPerfil(req.user.id))
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/perfil -> actualizar documento, teléfono, correo, dirección y contraseña. */
export async function actualizar(req, res, next) {
  try {
    const perfil = await actualizarPerfil(req.user.id, req.body, {
      usuarioId: req.user.id,
      ip: req.ip,
    })
    return res.json({ message: 'Información actualizada', ...perfil })
  } catch (error) {
    return next(error)
  }
}
