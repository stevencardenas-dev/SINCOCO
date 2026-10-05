import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import * as usuarioRepository from '../repositories/usuarioRepository.js'
import * as rolRepository from '../repositories/rolRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { MINUTOS_INACTIVIDAD } from '../db/sesion.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-01: login — valida credenciales y estado de cuenta, abre la sesión única
 * y emite el JWT.
 *
 * Sesión única por cuenta: si la cuenta ya tiene una sesión activa, este
 * segundo ingreso se rechaza y la sesión abierta sigue intacta (ver
 * middleware/auth.js).
 */
export async function iniciarSesion({ username, password } = {}, ctx = {}) {
  if (!username || !password) {
    throw new AppError('username y password son requeridos', 400)
  }

  const user = await usuarioRepository.findParaLogin(username)
  if (!user) throw new AppError('Credenciales inválidas', 401)
  if (user.estado !== 'ACTIVO') {
    const leyenda = user.estado === 'BLOQUEADO' ? 'bloqueada' : 'inactiva'
    throw new AppError(`Cuenta ${leyenda}. Contacte al administrador.`, 403)
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new AppError('Credenciales inválidas', 401)

  const sesion = randomUUID()
  const abierta = await usuarioRepository.abrirSesion(user.id, sesion, MINUTOS_INACTIVIDAD)
  if (!abierta) {
    await bitacora({
      usuarioId: user.id, accion: 'SESION_RECHAZADA', tabla: 'usuarios',
      registroId: user.id, ip: ctx.ip,
      detalles: { motivo: 'La cuenta ya tiene una sesión activa' },
    })
    throw new AppError(
      'Esta cuenta ya tiene una sesión abierta en otro navegador o dispositivo. ' +
        `Ciérrela allí o espere ${MINUTOS_INACTIVIDAD} minutos sin actividad para volver a ingresar.`,
      409,
      undefined,
      { codigo: 'SESION_ACTIVA' },
    )
  }
  await bitacora({
    usuarioId: user.id, accion: 'AUTENTICAR', tabla: 'usuarios',
    registroId: user.id, ip: ctx.ip,
  })

  const token = jwt.sign(
    { id: user.id, username: user.username, rol: user.rol, sid: sesion },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  )
  return { token, user: { id: user.id, username: user.username, rol: user.rol } }
}

/**
 * Cierra la sesión vigente: cualquier token emitido para la cuenta pierde
 * validez en la siguiente petición. La bitácora registra el cierre, igual que
 * el ingreso.
 */
export async function cerrarSesion(usuario, ctx = {}) {
  await usuarioRepository.cerrarSesion(usuario.id, usuario.sid)
  await bitacora({
    usuarioId: usuario.id,
    accion: 'CERRAR_SESION',
    tabla: 'usuarios',
    registroId: usuario.id,
    ip: ctx.ip,
  })
  return { cerrada: true }
}

/** Nombres de los permisos del rol del usuario conectado. */
export async function permisosDelUsuario(usuario) {
  return { permisos: await rolRepository.nombresPermisosDeRol(usuario.rol) }
}
