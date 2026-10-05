/**
 * Constantes de la sesión única por cuenta. Viven aquí (y no en el middleware)
 * para que repositorios y services las usen sin depender de la capa HTTP.
 * Ver middleware/auth.js para la regla completa.
 */
export const MINUTOS_INACTIVIDAD = Number(process.env.SESION_INACTIVIDAD_MIN) || 15

// Última señal de vida de la sesión. Las sesiones abiertas antes de existir
// `sesion_actividad` usan la hora de inicio.
export const ACTIVIDAD_SQL = 'COALESCE(sesion_actividad, sesion_iniciada_en)'
