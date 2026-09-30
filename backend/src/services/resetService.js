import bcrypt from 'bcrypt'
import * as resetRepository from '../repositories/resetRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * «¿Olvidó su contraseña?» del login (HU-01).
 *
 * El sistema no envía correo (no hay servidor de correo configurado), así que
 * el código de recuperación lo entrega el administrador: se genera aquí, queda
 * visible en el módulo de Usuarios y él se lo comunica a la persona. El código
 * es de un solo uso, vence en 30 minutos y admite 5 intentos.
 *
 * Nunca se revela si la cuenta existe: la respuesta es la misma en todos los
 * casos, para no permitir adivinar usuarios desde el login.
 */

const MINUTOS_VIGENCIA = 30
const MAX_INTENTOS = 5
const LARGO_MINIMO_PASSWORD = 8

// Alfabeto sin caracteres confundibles (0/O, 1/I/L) porque el código se lee
// de viva voz o se transcribe a mano.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generarCodigo() {
  let codigo = ''
  for (let i = 0; i < 8; i += 1) {
    codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  }
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`
}

/** Compara ignorando espacios, guiones y mayúsculas (el usuario lo transcribe). */
const normalizar = (texto) => String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/**
 * Registra la solicitud de recuperación. Responde siempre igual: si la cuenta
 * no existe o está inactiva, no se genera nada y el mensaje no cambia.
 */
export async function solicitarRestablecimiento(identificador, ctx = {}) {
  const valor = String(identificador ?? '').trim()
  if (!valor) {
    throw new AppError('Escriba su usuario o su correo empresarial', 400, 'usuario')
  }

  const usuario = await resetRepository.findUsuarioPorIdentificador(valor)
  if (!usuario || usuario.estado !== 'ACTIVO' || !usuario.activo) {
    // Se deja constancia del intento, sin decirle al cliente si acertó.
    await bitacora({
      usuarioId: null,
      accion: 'SOLICITAR_RESET',
      tabla: 'usuarios',
      detalles: { identificador: valor, resultado: 'cuenta no habilitada' },
      ip: ctx.ip,
    })
    return { solicitado: true, vigencia_minutos: MINUTOS_VIGENCIA }
  }

  await resetRepository.anularPendientes(usuario.id)
  const codigo = generarCodigo()
  await resetRepository.crearSolicitud({
    usuarioId: usuario.id,
    codigo,
    minutos: MINUTOS_VIGENCIA,
    ip: ctx.ip,
  })

  await bitacora({
    usuarioId: null,
    accion: 'SOLICITAR_RESET',
    tabla: 'usuarios',
    registroId: usuario.id,
    // El código no entra en la bitácora: solo el hecho de la solicitud.
    detalles: { username: usuario.username, vigencia_minutos: MINUTOS_VIGENCIA },
    ip: ctx.ip,
  })

  return { solicitado: true, vigencia_minutos: MINUTOS_VIGENCIA }
}

/** Restablece la contraseña con el código que entregó el administrador. */
export async function restablecerPassword({ usuario, codigo, password }, ctx = {}) {
  const valor = String(usuario ?? '').trim()
  if (!valor) throw new AppError('Escriba su usuario o su correo empresarial', 400, 'usuario')
  if (!codigo) throw new AppError('Escriba el código de recuperación', 400, 'codigo')

  const nueva = String(password ?? '')
  if (nueva.length < LARGO_MINIMO_PASSWORD) {
    throw new AppError(
      `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`,
      400,
      'password',
    )
  }

  const cuenta = await resetRepository.findUsuarioPorIdentificador(valor)
  const solicitud = cuenta ? await resetRepository.findSolicitudVigente(cuenta.id) : null

  // Un solo mensaje para todos los fallos de código: no se filtra información.
  const codigoInvalido = () =>
    new AppError('El código no es válido o ya venció. Solicite uno nuevo.', 400, 'codigo')

  if (!cuenta || !solicitud) throw codigoInvalido()
  if (Number(solicitud.vencido) === 1) {
    await resetRepository.marcarUsado(solicitud.id)
    throw codigoInvalido()
  }
  if (Number(solicitud.intentos) >= MAX_INTENTOS) {
    await resetRepository.marcarUsado(solicitud.id)
    throw new AppError('Se agotaron los intentos del código. Solicite uno nuevo.', 429, 'codigo')
  }
  if (normalizar(solicitud.codigo) !== normalizar(codigo)) {
    await resetRepository.sumarIntento(solicitud.id)
    throw codigoInvalido()
  }

  await resetRepository.actualizarPassword(cuenta.id, await bcrypt.hash(nueva, 10))
  await resetRepository.marcarUsado(solicitud.id)
  await resetRepository.anularPendientes(cuenta.id)

  await bitacora({
    usuarioId: cuenta.id,
    accion: 'RESTABLECER_PASSWORD',
    tabla: 'usuarios',
    registroId: cuenta.id,
    detalles: { username: cuenta.username, por: 'recuperación con código' },
    ip: ctx.ip,
  })

  return { username: cuenta.username }
}

/** Solicitudes pendientes que el administrador debe entregar (módulo Usuarios). */
export async function listarSolicitudesPendientes() {
  const filas = await resetRepository.listarSolicitudesVigentes()
  return filas.map((f) => ({
    id: Number(f.id),
    usuario_id: Number(f.usuario_id),
    username: f.username,
    email: f.email,
    trabajador: f.trabajador,
    codigo: f.codigo,
    solicitado_en: f.solicitado_en,
    expira_en: f.expira_en,
    minutos_restantes: Number(f.minutos_restantes),
    direccion_ip: f.direccion_ip,
  }))
}
