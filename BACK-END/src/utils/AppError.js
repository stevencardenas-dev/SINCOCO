/**
 * Error de aplicación con código de estado HTTP asociado.
 * Permite que services/controllers lancen errores de negocio
 * que el errorHandler traduce a respuestas JSON consistentes.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
