import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'

// RF1 / RNF5: valida el JWT y adjunta { id, rol } a req.user.
//
// Además de la firma del token se comprueba, contra la base, que la cuenta siga
// habilitada y que la sesión del token sea la vigente. Cada ingreso genera un
// `sid` nuevo en `usuarios.sesion_actual` (sesión única por cuenta): el token de
// un ingreso anterior deja de servir, así que no se pueden mantener dos sesiones
// abiertas con la misma cuenta.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Token requerido' })

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  try {
    const [rows] = await pool.query(
      'SELECT sesion_actual, estado, activo FROM usuarios WHERE id = ? LIMIT 1',
      [payload.id],
    )
    const cuenta = rows[0]
    if (!cuenta || cuenta.estado !== 'ACTIVO' || !cuenta.activo) {
      return res.status(401).json({ error: 'La cuenta ya no está habilitada' })
    }
    // Sin `sid` (token emitido antes de esta regla) o con una sesión que dejó de
    // ser la vigente: hay que volver a iniciar sesión.
    if (!payload.sid) {
      return res.status(401).json({ error: 'Sesión no válida. Vuelva a iniciar sesión.' })
    }
    if (payload.sid !== cuenta.sesion_actual) {
      return res.status(401).json({
        error: cuenta.sesion_actual
          ? 'Su sesión se cerró: la cuenta ingresó desde otro dispositivo'
          : 'Su sesión finalizó. Vuelva a iniciar sesión.',
      })
    }

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
