/**
 * Utilidades de la capa HTTP compartidas por los controladores.
 */

/**
 * Envuelve un handler async para que cualquier error (lanzado o rechazado)
 * llegue al manejador de errores de Express (Express 4 no lo hace solo).
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

/** Contexto de auditoría que reciben los services: quién actúa y desde dónde. */
export const contexto = (req) => ({
  usuario: req.user,
  usuarioId: req.user.id,
  ip: req.ip,
})
