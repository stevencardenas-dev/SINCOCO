import * as authService from '../services/authService.js'
import { solicitarRestablecimiento, restablecerPassword } from '../services/resetService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/** POST /api/auth/login -> HU-01: valida credenciales y emite el JWT. */
export const login = asyncHandler(async (req, res) => {
  res.json(await authService.iniciarSesion(req.body ?? {}, { ip: req.ip }))
})

/** POST /api/auth/logout -> cerrar la sesión vigente. */
export const logout = asyncHandler(async (req, res) => {
  return res.json(await authService.cerrarSesion(req.user, contexto(req)))
})

/**
 * GET /api/auth/sesion -> latido del frontend mientras la aplicación está
 * abierta. requireAuth ya valida la sesión y registra la actividad, así que la
 * cuenta no se da por abandonada aunque el usuario no haga clic en nada.
 */
export function latido(req, res) {
  res.json({ activa: true })
}

/** GET /api/auth/permisos -> nombres de los permisos del rol del usuario. */
export const misPermisos = asyncHandler(async (req, res) => {
  return res.json(await authService.permisosDelUsuario(req.user))
})

/**
 * POST /api/auth/solicitar-reset -> «¿Olvidó su contraseña?» (HU-01).
 *
 * Público (no hay sesión todavía). Genera un código de un solo uso para la
 * cuenta y responde siempre igual, exista o no el usuario.
 */
export const solicitarReset = asyncHandler(async (req, res) => {
  const { usuario, email } = req.body ?? {}
  const resultado = await solicitarRestablecimiento(usuario ?? email, { ip: req.ip })
  return res.json({
    message: 'Si la cuenta existe, la solicitud quedó registrada.',
    ...resultado,
  })
})

/**
 * POST /api/auth/restablecer -> definir la contraseña nueva con el código.
 * Público: es la continuación del flujo anterior desde el login.
 */
export const restablecer = asyncHandler(async (req, res) => {
  const { usuario, email, codigo, password } = req.body ?? {}
  const resultado = await restablecerPassword(
    { usuario: usuario ?? email, codigo, password },
    { ip: req.ip },
  )
  return res.json({ message: 'Contraseña restablecida. Ya puede iniciar sesión.', ...resultado })
})
