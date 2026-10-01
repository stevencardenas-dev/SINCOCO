/**
 * Mensajes de error de la API para los formularios.
 *
 * Regla del proyecto: cuando una regla de negocio no se cumple, el usuario debe
 * ver el MENSAJE que devuelve la API (`{ error: '...' }`), nunca el código HTTP
 * ni un objeto técnico. `errorHandler` del backend ya traduce las excepciones a
 * ese formato; aquí solo se elige el texto de respaldo por si la red falla.
 *
 * `campoError` devuelve el campo señalado (CU-02 Alt 1, CU-01 Alt 1) para
 * resaltarlo, o null.
 */
export function mensajeError(error, respaldo = 'Ocurrió un error inesperado. Intente de nuevo.') {
  return error?.response?.data?.error ?? error?.message ?? respaldo
}

export function campoError(error) {
  return error?.response?.data?.campo ?? null
}
