import bcrypt from 'bcrypt'
import * as usuarioRepository from '../repositories/usuarioRepository.js'
import * as rolRepository from '../repositories/rolRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { crearBajaReactivar } from './bajaReactivar.js'
import { AppError } from '../utils/AppError.js'
import { LARGO, revisarCorreo, revisarLargo, revisarPassword } from '../utils/campos.js'

/**
 * Gestión de cuentas de usuario (HU-01 · CU-01 · HU-18).
 */

const ESTADOS = ['ACTIVO', 'INACTIVO', 'BLOQUEADO']

/** HU-01: crear usuario con rol asignado. */
export async function crearUsuario(body = {}, ctx = {}) {
  const { username, password, email, rol_id, trabajador_id } = body
  // AYD-13 criterio 1: el usuario debe estar vinculado a un trabajador y a un
  // único rol. trabajador_id era opcional y el criterio lo exige.
  if (!username || !password || !email || !rol_id || !trabajador_id) {
    throw new AppError('username, password, email, rol_id y trabajador_id son requeridos', 400)
  }
  // RNF04: la validación del formulario no basta, la API se puede llamar
  // directamente. Las longitudes se revisan contra las columnas de la base
  // (usuarios.username varchar(50), email varchar(150)) y el correo debe tener
  // forma de correo.
  revisarLargo(username, LARGO.username, 'username')
  revisarLargo(email, LARGO.email, 'email')
  revisarCorreo(email)
  revisarPassword(password, 8)

  const password_hash = await bcrypt.hash(password, 10)
  let id
  try {
    id = await usuarioRepository.create({ trabajador_id, username, password_hash, email, rol_id })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      // CU-01 Alt 1: señalar el campo en conflicto, no un error genérico.
      // trabajador_id es UNIQUE: un trabajador no puede tener dos cuentas.
      const campo = /trabajador/.test(err.message) ? 'trabajador'
        : /email/.test(err.message) ? 'email' : 'username'
      const mensaje = campo === 'trabajador'
        ? 'ese trabajador ya tiene una cuenta de usuario'
        : `${campo} ya existe`
      throw new AppError(mensaje, 409, campo)
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new AppError('el trabajador o el rol indicado no existe', 400)
    }
    throw err
  }

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'CREAR', tabla: 'usuarios',
    registroId: id, detalles: { username, email, rol_id, trabajador_id }, ip: ctx.ip,
  })
  return { id }
}

/**
 * Edita los datos de la cuenta: nombre de usuario y correo empresarial. El rol,
 * el estado y la baja tienen sus propias rutas y permisos. Una cuenta dada de
 * baja es historial: primero se reactiva.
 */
export async function editarUsuario(id, body = {}, ctx = {}) {
  id = Number(id)
  const { username, email } = body
  if (!username || !email) {
    throw new AppError('username y email son requeridos', 400)
  }
  revisarLargo(username, LARGO.username, 'username')
  revisarLargo(email, LARGO.email, 'email')
  revisarCorreo(email)

  const actual = await usuarioRepository.findParaEditar(id)
  if (!actual) throw new AppError('Usuario no encontrado', 404)
  if (!actual.activo) {
    throw new AppError('La cuenta está dada de baja; reactívela antes de editarla', 409)
  }

  try {
    await usuarioRepository.updateDatos(id, { username, email })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const campo = /email/.test(err.message) ? 'email' : 'username'
      throw new AppError(`${campo} ya existe`, 409, campo)
    }
    throw err
  }
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'usuarios', registroId: id,
    detalles: { antes: { username: actual.username, email: actual.email }, despues: { username, email } },
    ip: ctx.ip,
  })
  return { id, username, email }
}

/** HU-01: lista las cuentas. HU-18: por defecto solo las activas. */
export async function listarUsuarios({ incluirInactivos = false } = {}) {
  return usuarioRepository.listar({ incluirInactivos })
}

/** CU-01 criterio 1: trabajadores activos y sin cuenta, para elegir en el formulario. */
export async function listarTrabajadoresSinCuenta() {
  return usuarioRepository.listarTrabajadoresSinCuenta()
}

/** CU-01 precondición: el rol a asignar ya existe; el formulario necesita la lista. */
export async function listarRoles() {
  return rolRepository.listar()
}

/**
 * CU-01 Alt 3: cambia el rol de un usuario existente. Los permisos pasan a ser
 * los del rol nuevo; el historial ya registrado no se altera (solo se añade la
 * entrada del cambio a la bitácora).
 */
export async function cambiarRol(id, body = {}, ctx = {}) {
  const { rol_id } = body
  if (!rol_id) throw new AppError('rol_id es requerido', 400)

  const previo = await usuarioRepository.findRolActual(id)
  if (!previo) throw new AppError('usuario no encontrado', 404)
  if (Number(previo.rol_id) === Number(rol_id)) {
    return { id: Number(id), rol_id: Number(rol_id), sinCambio: true }
  }
  const rolNuevo = await rolRepository.findById(rol_id)
  if (!rolNuevo) throw new AppError('el rol indicado no existe', 400)

  await usuarioRepository.updateRol(id, rol_id)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'usuarios',
    registroId: Number(id),
    detalles: { campo: 'rol_id', antes: previo.rol, despues: rolNuevo.nombre }, ip: ctx.ip,
  })
  return { id: Number(id), rol_id: Number(rol_id), rol: rolNuevo.nombre }
}

/** HU-01: activar, inactivar o bloquear un usuario. */
export async function cambiarEstado(id, body = {}, ctx = {}) {
  const { estado } = body
  if (!ESTADOS.includes(estado)) throw new AppError('estado inválido', 400)

  const previo = await usuarioRepository.findEstado(id)
  await usuarioRepository.updateEstado(id, estado)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'usuarios',
    registroId: Number(id), detalles: { antes: previo?.estado, despues: estado }, ip: ctx.ip,
  })
  return { id: Number(id), estado }
}

/**
 * HU-18: baja lógica y reactivación de cuentas (activo = 0 y estado INACTIVO),
 * sin borrarlas: el historial y la bitácora se conservan.
 */
const bajaReactivar = crearBajaReactivar({
  tabla: 'usuarios',
  mensajes: {
    yaDeBaja: 'La cuenta ya estaba dada de baja',
    noEstaDeBaja: 'La cuenta no está dada de baja',
  },
})

export const darDeBajaUsuario = bajaReactivar.darDeBaja
export const reactivarUsuario = bajaReactivar.reactivar
