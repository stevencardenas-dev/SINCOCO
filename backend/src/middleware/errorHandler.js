import { AppError } from '../utils/AppError.js'

/**
 * Middleware de manejo de errores de la capa de proyectos (HU-02).
 * Traduce los AppError lanzados por DTOs y services a respuestas JSON
 * con la forma { error } usada por toda la API (HU-01). Cualquier error
 * no controlado se responde como 500 con el mensaje genérico que ya
 * usaba server.js, para no cambiar el contrato de las rutas existentes.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { error: err.message }
    if (err.campo) body.campo = err.campo
    return res.status(err.statusCode).json(body)
  }

  console.error(err)
  return res.status(500).json({ error: 'Error interno del servidor' })
}
