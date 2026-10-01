import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'
import { registrar } from '../db/bitacora.js'
import { solicitarRestablecimiento, restablecerPassword } from '../services/resetService.js'

// HU-01: login — valida credenciales y estado de cuenta, emite JWT
export async function login(req, res) {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son requeridos' })
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.estado, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     WHERE u.username = ?`,
    [username],
  )
  const user = rows[0]
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })
  if (user.estado !== 'ACTIVO') {
    const leyenda = user.estado === 'BLOQUEADO' ? 'bloqueada' : 'inactiva'
    return res.status(403).json({ error: `Cuenta ${leyenda}. Contacte al administrador.` })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' })

  // Sesión única por cuenta: este ingreso reemplaza la sesión vigente, de modo
  // que el token de un ingreso anterior deja de ser válido (ver middleware/auth.js).
  const sesion = randomUUID()
  await pool.query(
    'UPDATE usuarios SET ultimo_acceso = NOW(), sesion_actual = ?, sesion_iniciada_en = NOW() WHERE id = ?',
    [sesion, user.id],
  )
  await registrar({
    usuarioId: user.id, accion: 'AUTENTICAR', tabla: 'usuarios',
    registroId: user.id, ip: req.ip,
  })

  const token = jwt.sign(
    { id: user.id, username: user.username, rol: user.rol, sid: sesion },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  )
  res.json({ token, user: { id: user.id, username: user.username, rol: user.rol } })
}

/**
 * POST /api/auth/logout -> cerrar la sesión vigente.
 *
 * Deja la cuenta sin sesión activa: cualquier token emitido para ella pierde
 * validez en la siguiente petición. La bitácora registra el cierre, igual que
 * el ingreso.
 */
export async function logout(req, res, next) {
  try {
    await pool.query('UPDATE usuarios SET sesion_actual = NULL WHERE id = ?', [req.user.id])
    await registrar({
      usuarioId: req.user.id,
      accion: 'CERRAR_SESION',
      tabla: 'usuarios',
      registroId: req.user.id,
      ip: req.ip,
    })
    return res.json({ cerrada: true })
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/solicitar-reset -> «¿Olvidó su contraseña?» (HU-01).
 *
 * Público (no hay sesión todavía). Genera un código de un solo uso para la
 * cuenta y responde siempre igual, exista o no el usuario.
 */
export async function solicitarReset(req, res, next) {
  try {
    const { usuario, email } = req.body ?? {}
    const resultado = await solicitarRestablecimiento(usuario ?? email, { ip: req.ip })
    return res.json({
      message: 'Si la cuenta existe, la solicitud quedó registrada.',
      ...resultado,
    })
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/restablecer -> definir la contraseña nueva con el código.
 * Público: es la continuación del flujo anterior desde el login.
 */
export async function restablecer(req, res, next) {
  try {
    const { usuario, email, codigo, password } = req.body ?? {}
    const resultado = await restablecerPassword(
      { usuario: usuario ?? email, codigo, password },
      { ip: req.ip },
    )
    return res.json({ message: 'Contraseña restablecida. Ya puede iniciar sesión.', ...resultado })
  } catch (error) {
    return next(error)
  }
}
