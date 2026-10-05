import * as rolRepository from '../repositories/rolRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { esRolSistema } from '../utils/roles.js'

/**
 * HU-01 · criterio 4 (RF01 · RNF05) — administración de roles y permisos.
 *
 * Los permisos del usuario están determinados por los de su rol
 * (`roles_permisos`), no se asignan de forma individual: esta pantalla mueve esa
 * matriz. El administrador puede crear roles, editar su nombre/descripción,
 * eliminarlos (solo si nadie los tiene asignados) y marcar qué permisos concede
 * cada rol.
 *
 * Los cuatro roles base (ver utils/roles.js) son roles de sistema: el código de
 * la interfaz los nombra, así que no se pueden renombrar ni eliminar; su
 * descripción y sus permisos sí se administran aquí.
 *
 * El seed docs/seed_permisos_prueba.sql carga la matriz inicial; a partir de
 * ahí esta pantalla puede cambiarla.
 */

function validarNombre(nombre) {
  const limpio = nombre === undefined || nombre === null ? '' : String(nombre).trim().toUpperCase()
  if (limpio.length < 3 || limpio.length > 50) {
    throw new AppError('El nombre del rol debe tener entre 3 y 50 caracteres', 400, 'nombre')
  }
  if (!/^[A-Z0-9_ ]+$/.test(limpio)) {
    throw new AppError(
      'El nombre del rol solo admite letras, números, espacios y guion bajo',
      400,
      'nombre',
    )
  }
  return limpio
}

function validarDescripcion(descripcion) {
  if (descripcion === undefined || descripcion === null || String(descripcion).trim() === '') {
    return null
  }
  const limpio = String(descripcion).trim()
  if (limpio.length > 255) {
    throw new AppError('La descripción no puede superar los 255 caracteres', 400, 'descripcion')
  }
  return limpio
}

export async function listarRoles() {
  return rolRepository.listar()
}

export async function matrizRolesPermisos() {
  const roles = await rolRepository.listarConConteos()
  // Catálogo completo: el frontend necesita también los permisos que ningún
  // rol tiene, para que la matriz muestre la fila aunque esté vacía.
  const permisos = await rolRepository.listarPermisos()
  const asignaciones = await rolRepository.listarAsignaciones()

  return {
    generado_en: new Date().toISOString(),
    roles: roles.map((r) => ({ ...r, es_sistema: esRolSistema(r.nombre) })),
    permisos,
    asignaciones,
  }
}

/** Crea un rol nuevo (nace sin permisos). */
export async function crearRol(body, ctx = {}) {
  const nombre = validarNombre(body?.nombre)
  const descripcion = validarDescripcion(body?.descripcion)
  if (await rolRepository.findPorNombre(nombre)) {
    throw new AppError('Ya existe un rol con ese nombre', 409, 'nombre')
  }

  const id = await rolRepository.create({ nombre, descripcion })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'roles',
    registroId: id,
    detalles: { nombre },
    ip: ctx.ip,
  })
  return rolRepository.findById(id)
}

/** Edita nombre y descripción del rol. */
export async function actualizarRol(id, body, ctx = {}) {
  const actual = await rolRepository.findById(id)
  if (!actual) throw new AppError('El rol no existe', 404)

  const campos = {}
  if (body?.nombre !== undefined) {
    const nombre = validarNombre(body.nombre)
    if (esRolSistema(actual.nombre) && nombre !== actual.nombre) {
      throw new AppError(
        `El rol ${actual.nombre} es un rol base del sistema y no se puede renombrar`,
        400,
        'nombre',
      )
    }
    const existente = await rolRepository.findPorNombre(nombre)
    if (existente && Number(existente.id) !== Number(id)) {
      throw new AppError('Ya existe un rol con ese nombre', 409, 'nombre')
    }
    campos.nombre = nombre
  }
  if (body?.descripcion !== undefined) {
    campos.descripcion = validarDescripcion(body.descripcion)
  }
  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  await rolRepository.update(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'roles',
    registroId: Number(id),
    detalles: { cambios: campos },
    ip: ctx.ip,
  })
  return rolRepository.findById(id)
}

/**
 * Elimina un rol.
 *
 * Regla de negocio: un rol con usuarios asignados no se elimina (hay que
 * reasignarlos primero), porque usuarios.rol_id es obligatorio. Los roles base
 * tampoco se eliminan.
 */
export async function eliminarRol(id, ctx = {}) {
  const rol = await rolRepository.findById(id)
  if (!rol) throw new AppError('El rol no existe', 404)
  if (esRolSistema(rol.nombre)) {
    throw new AppError(`El rol ${rol.nombre} es un rol base del sistema y no se puede eliminar`, 409)
  }

  const usuarios = await rolRepository.contarUsuarios(id)
  if (usuarios > 0) {
    throw new AppError(
      `No se puede eliminar el rol ${rol.nombre}: tiene ${usuarios} ${
        usuarios === 1 ? 'usuario asignado' : 'usuarios asignados'
      }. Reasígnelos primero.`,
      409,
    )
  }

  await rolRepository.remove(id)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ELIMINAR',
    tabla: 'roles',
    registroId: Number(id),
    detalles: { nombre: rol.nombre },
    ip: ctx.ip,
  })
  return { id: Number(id), eliminado: true }
}

/**
 * Reemplaza el conjunto de permisos del rol.
 *
 * Recibe `permiso_ids` (array) y deja `roles_permisos` exactamente con esa
 * lista: la matriz que se ve en la pantalla es la que el backend consulta en
 * cada petición con `requirePermiso`.
 */
export async function asignarPermisos(id, body, ctx = {}) {
  const rol = await rolRepository.findById(id)
  if (!rol) throw new AppError('El rol no existe', 404)

  if (!Array.isArray(body?.permiso_ids)) {
    throw new AppError('permiso_ids debe ser una lista de ids de permiso', 400, 'permiso_ids')
  }
  const ids = [...new Set(body.permiso_ids.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))]

  if ((await rolRepository.contarPermisosExistentes(ids)) !== ids.length) {
    throw new AppError('Alguno de los permisos indicados no existe', 400, 'permiso_ids')
  }

  // Salvaguarda: nadie se deja fuera de esta misma pantalla. Si el rol que
  // administra es el del usuario que hace el cambio, no puede perder
  // `roles.gestionar` (quedaría sin poder volver a concederlo).
  if (rol.nombre === ctx.usuario?.rol) {
    const permiso = await rolRepository.findPermisoPorNombre('roles.gestionar')
    if (permiso && !ids.includes(Number(permiso.id))) {
      throw new AppError(
        'No puede quitarse a sí mismo el permiso para administrar roles: dejaría el sistema sin forma de volver a concederlo.',
        400,
        'permiso_ids',
      )
    }
  }

  await rolRepository.reemplazarPermisos(id, ids)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ASIGNAR_PERMISOS',
    tabla: 'roles_permisos',
    registroId: Number(id),
    detalles: { rol: rol.nombre, permisos: ids.length },
    ip: ctx.ip,
  })
  return { id: Number(id), rol: rol.nombre, permisos: ids.length }
}
