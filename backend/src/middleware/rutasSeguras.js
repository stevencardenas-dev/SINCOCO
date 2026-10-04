/**
 * Red de seguridad de las rutas frente a controladores `async`.
 *
 * Express 4 no reenvía al manejador de errores la promesa rechazada de un
 * controlador `async`: el rechazo queda sin capturar y Node termina el proceso.
 * Comprobado en la auditoría de casos límite: crear un usuario con una
 * contraseña de tres caracteres no devolvía 400 — **apagaba el servidor** y
 * dejaba sin servicio a todos los usuarios conectados.
 *
 * Este envoltorio recorre las rutas del router una sola vez, al montarlo, y
 * convierte cada controlador en `fn(req, res, next).catch(next)`. A partir de
 * ahí cualquier AppError lanzado dentro (validaciones, 404, 409…) llega al
 * `errorHandler` y se responde con su estado en vez de tumbar el servicio.
 *
 * Se aplica en el punto de montaje (`server.js`) y no controlador por
 * controlador a propósito: así ninguna ruta que se añada en el futuro queda sin
 * la red de seguridad.
 */
export function rutasSeguras(router) {
  for (const capa of router.stack ?? []) {
    if (!capa.route) continue
    for (const manejador of capa.route.stack) {
      const original = manejador.handle
      // Un manejador de errores de Express declara cuatro argumentos: ese no se
      // envuelve, se deja tal cual.
      if (typeof original !== 'function' || original.length >= 4) continue
      manejador.handle = (req, res, next) => {
        try {
          const resultado = original(req, res, next)
          if (resultado && typeof resultado.catch === 'function') resultado.catch(next)
        } catch (error) {
          next(error)
        }
      }
    }
  }
  return router
}
