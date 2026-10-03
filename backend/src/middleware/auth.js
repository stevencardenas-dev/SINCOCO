import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'

/**
 * Sesión única por cuenta (RNF05 · seguridad).
 *
 * Cada ingreso guarda un identificador de sesión en `usuarios.sesion_actual`
 * (que también viaja firmado en el JWT como `sid`) y cada petición actualiza
 * `usuarios.sesion_actividad`. Mientras esa sesión siga activa, un segundo
 * ingreso con la misma cuenta se RECHAZA (ver authController.login): la sesión
 * abierta no se interrumpe.
 *
 * La sesión deja de estar activa, y la cuenta queda libre, cuando:
 *   - el usuario cierra sesión (POST /api/auth/logout),
 *   - pasan MINUTOS_INACTIVIDAD sin peticiones (p. ej. cerró el navegador sin
 *     salir; el frontend envía un latido mientras la aplicación está abierta),
 *   - vence el JWT, o
 *   - se restablece la contraseña.
 */
export const MINUTOS_INACTIVIDAD = Number(process.env.SESION_INACTIVIDAD_MIN) || 15

// Última señal de vida de la sesión. Las sesiones abiertas antes de existir
// `sesion_actividad` usan la hora de inicio.
export const ACTIVIDAD_SQL = 'COALESCE(sesion_actividad, sesion_iniciada_en)'

// RF1 / RNF5: valida el JWT, la cuenta y la sesión, y adjunta { id, rol, sid } a req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Token requerido' })

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    // Token vencido: libera su sesión para que el usuario pueda volver a
    // ingresar sin esperar el tiempo de inactividad.
    if (error.name === 'TokenExpiredError') {
      try {
        const vencido = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true })
        if (vencido?.sid) {
          await pool.query('UPDATE usuarios SET sesion_actual = NULL WHERE id = ? AND sesion_actual = ?', [
            vencido.id,
            vencido.sid,
          ])
        }
      } catch {
        // Firma inválida: no se toca nada.
      }
    }
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT sesion_actual, estado, activo,
              ${ACTIVIDAD_SQL} >= NOW() - INTERVAL ? MINUTE AS vigente
         FROM usuarios WHERE id = ? LIMIT 1`,
      [MINUTOS_INACTIVIDAD, payload.id],
    )
    const cuenta = rows[0]
    if (!cuenta || cuenta.estado !== 'ACTIVO' || !cuenta.activo) {
      return res.status(401).json({ error: 'La cuenta ya no está habilitada' })
    }
    // Sin `sid` (token emitido antes de esta regla), sesión cerrada o
    // abandonada por inactividad: hay que volver a iniciar sesión.
    if (!payload.sid || payload.sid !== cuenta.sesion_actual || !cuenta.vigente) {
      return res.status(401).json({
        error: 'Su sesión finalizó (se cerró o estuvo inactiva). Vuelva a iniciar sesión.',
        codigo: 'SESION_EXPIRADA',
      })
    }

    // Registra actividad: como mucho una escritura por minuto y cuenta.
    await pool.query(
      `UPDATE usuarios SET sesion_actividad = NOW()
        WHERE id = ? AND sesion_actual = ?
          AND (sesion_actividad IS NULL OR sesion_actividad < NOW() - INTERVAL 1 MINUTE)`,
      [payload.id, payload.sid],
    )

    req.user = payload
    return next()
  } catch (error) {
    return next(error)
  }
}

// RBAC: uso, requireRole('ADMINISTRADOR', 'GERENTE')
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado para este rol' })
    }
    next()
  }
}
