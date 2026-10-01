import bcrypt from 'bcrypt'
import * as perfilRepository from '../repositories/perfilRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * Información personal de quien está conectado (HU-01 · HU-04).
 *
 * Cada usuario puede consultar sus datos y corregir los suyos: teléfono, correo
 * de contacto y dirección de su ficha de trabajador, más su contraseña. El
 * número de documento es la identidad de la ficha y no se modifica (igual que en
 * /api/trabajadores/:id). El correo empresarial (`usuarios.email`) y el rol son
 * datos de la empresa y solo los cambia el administrador; el cargo y la
 * especialidad salen del catálogo y tampoco se editan aquí.
 *
 * Todo cambio queda en la bitácora (RF31 · RN07): la contraseña se registra
 * como el hecho de haberla cambiado, nunca su valor.
 */

const CAMPOS_EDITABLES = ['telefono', 'email', 'direccion']
const LARGO_MINIMO_PASSWORD = 8

/** Forma la respuesta de GET /api/perfil separando cuenta y ficha. */
export async function obtenerPerfil(usuarioId) {
  const fila = await perfilRepository.findPerfil(usuarioId)
  if (!fila) throw new AppError('Usuario no encontrado', 404)

  return {
    usuario: {
      id: Number(fila.usuario_id),
      username: fila.username,
      email_empresarial: fila.email_empresarial,
      rol: fila.rol,
      estado: fila.estado,
      ultimo_acceso: fila.ultimo_acceso,
      creado_en: fila.creado_en,
    },
    trabajador: fila.trabajador_id
      ? {
          id: Number(fila.trabajador_id),
          numero_documento: fila.numero_documento,
          tipo_documento: fila.tipo_documento,
          nombres: fila.nombres,
          apellidos: fila.apellidos,
          email: fila.email_contacto,
          telefono: fila.telefono,
          direccion: fila.direccion,
          estado: fila.estado_trabajador,
          cargo: fila.cargo,
          especialidad: fila.especialidad,
        }
      : null,
  }
}

const textoOpcional = (v) =>
  v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim()

/**
 * Actualiza la ficha de trabajador y/o la contraseña del usuario conectado.
 * Devuelve el perfil ya actualizado.
 */
export async function actualizarPerfil(usuarioId, cambios = {}, ctx = {}) {
  const perfil = await obtenerPerfil(usuarioId)

  // --- Ficha del trabajador -------------------------------------------------
  const campos = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo]
  }

  if (Object.keys(campos).length > 0) {
    if (!perfil.trabajador) {
      throw new AppError(
        'La cuenta no tiene ficha de trabajador: el administrador debe asociarla antes de editar estos datos',
        400,
      )
    }

    if (campos.email !== undefined) {
      campos.email = textoOpcional(campos.email)
      if (await perfilRepository.emailEnUso(campos.email, perfil.trabajador.id)) {
        throw new AppError('Ya existe un trabajador con ese correo de contacto', 409, 'email')
      }
    }

    for (const campo of ['telefono', 'direccion']) {
      if (campos[campo] !== undefined) campos[campo] = textoOpcional(campos[campo])
    }

    await perfilRepository.actualizarTrabajador(perfil.trabajador.id, campos)

    await bitacora({
      usuarioId,
      accion: 'ACTUALIZAR',
      tabla: 'trabajadores',
      registroId: perfil.trabajador.id,
      // El propio usuario actualizó su información personal.
      detalles: { cambios: campos, por: 'el propio usuario' },
      ip: ctx.ip,
    })
  }

  // --- Contraseña -----------------------------------------------------------
  if (cambios.password !== undefined && String(cambios.password) !== '') {
    const password = String(cambios.password)
    if (password.length < LARGO_MINIMO_PASSWORD) {
      throw new AppError(
        `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`,
        400,
        'password',
      )
    }
    if (password === cambios.password_actual) {
      throw new AppError('La contraseña nueva debe ser distinta a la actual', 400, 'password')
    }
    if (!cambios.password_actual) {
      throw new AppError('Escriba su contraseña actual para poder cambiarla', 400, 'password_actual')
    }

    // Se confirma la contraseña actual: la sesión abierta no basta para
    // cambiarla (alguien que deje el equipo solo no debe poder hacerlo).
    const hashActual = await perfilRepository.findPasswordHash(usuarioId)
    const coincide = hashActual ? await bcrypt.compare(String(cambios.password_actual), hashActual) : false
    if (!coincide) {
      // 400 y no 401: la sesión es válida; lo que no coincide es el campo. Con
      // 401 el cliente cerraría la sesión en vez de mostrar el error del campo.
      throw new AppError('La contraseña actual no es correcta', 400, 'password_actual')
    }

    await perfilRepository.cambiarPassword(usuarioId, await bcrypt.hash(password, 10))

    await bitacora({
      usuarioId,
      accion: 'ACTUALIZAR',
      tabla: 'usuarios',
      registroId: usuarioId,
      // Nunca se guarda la contraseña: solo el hecho del cambio.
      detalles: { campo: 'password', por: 'el propio usuario' },
      ip: ctx.ip,
    })
  }

  if (Object.keys(campos).length === 0
      && (cambios.password === undefined || String(cambios.password) === '')) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  return obtenerPerfil(usuarioId)
}
