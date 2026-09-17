const AppError = require('../utils/AppError');

/**
 * Middleware de manejo de errores. Traduce los AppError lanzados por
 * services/DTOs a respuestas JSON con la estructura acordada:
 * { success: false, message: "..." }.
 * Cualquier error no controlado se responde como 500.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Ocurrió un error inesperado en el servidor',
  });
}

module.exports = errorHandler;
