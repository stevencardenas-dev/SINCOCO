import { AppError } from '../utils/AppError.js'

/**
 * Middleware de manejo de errores de la capa de proyectos (HU-02).
 * Traduce los AppError lanzados por DTOs y services a respuestas JSON
 * con la forma { error } usada por toda la API (HU-01). Cualquier error
 * no controlado se responde como 500 con el mensaje genérico que ya
 * usaba server.js, para no cambiar el contrato de las rutas existentes.
 */
// eslint-disable-next-line no-unused-vars
const MENSAJES_PETICION = {
  400: 'El cuerpo de la petición no es JSON válido',
  413: 'El cuerpo de la petición es demasiado grande',
  415: 'El tipo de contenido de la petición no está soportado',
}

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { error: err.message }
    if (err.campo) body.campo = err.campo
    if (err.extra) Object.assign(body, err.extra)
    return res.status(err.statusCode).json(body)
  }

  // Errores del propio express.json (JSON mal formado, cuerpo gigante,
  // codificación rara): los marca con `status`/`statusCode` y son culpa de la
  // petición, no del servidor. Antes caían al 500 genérico, así que un `curl`
  // con comillas mal cerradas parecía una caída del sistema.
  const estado = Number(err?.status || err?.statusCode)
  if (Number.isInteger(estado) && estado >= 400 && estado < 500) {
    return res.status(estado).json({
      error: MENSAJES_PETICION[estado] || 'La petición no se pudo interpretar',
    })
  }

  console.error(err)
  return res.status(500).json({ error: 'Error interno del servidor' })
}
