/**
 * Error de aplicación con código de estado HTTP asociado (HU-02).
 * Permite que DTOs y services lancen errores de negocio que el
 * errorHandler de `middleware/errorHandler.js` traduce a respuestas
 * JSON consistentes con el resto de la API ({ error: '...' }).
 *
 * `campo` es opcional: cuando el error señala un campo concreto del
 * formulario (CU-02 Alt 1: fechas inconsistentes), la API lo expone
 * igual que ya lo hace CU-01 Alt 1 con el campo en conflicto.
 */
export class AppError extends Error {
  constructor(message, statusCode, campo) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    if (campo) this.campo = campo
  }
}
