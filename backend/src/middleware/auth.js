import jwt from 'jsonwebtoken'

// RF1 / RNF5: valida el JWT y adjunta { id, rol } a req.user
export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Token requerido' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
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
