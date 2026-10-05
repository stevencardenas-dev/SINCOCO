import * as clienteRepository from '../repositories/clienteRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { crearBajaReactivar } from './bajaReactivar.js'
import { TIPOS_DOCUMENTO } from '../dtos/cliente/RegistrarClienteDto.js'
import { LARGO, revisarCorreo, revisarLargo, revisarTelefono, textoOpcional } from '../utils/campos.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-02 · CU-02 Alt 2: catálogo de clientes que alimenta el formulario de
 * registro de proyecto. Un cliente es actor del negocio, no usuario del
 * sistema, así que no pasa por el módulo de usuarios.
 */
/** `incluirInactivos` lo usa Gestión Administrativa (HU-18). */
export async function listarClientes({ incluirInactivos = false } = {}) {
  return clienteRepository.listar(incluirInactivos)
}

/**
 * Registra un cliente nuevo. `numero_documento` es UNIQUE en el esquema:
 * si ya existe se responde 409 señalando el campo en conflicto.
 */
export async function registrarCliente(dto, ctx = {}) {
  const existente = await clienteRepository.findByDocumento(dto.numero_documento)
  if (existente) {
    throw new AppError('Ya existe un cliente con ese número de documento', 409, 'numero_documento')
  }

  const id = await clienteRepository.create(dto)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'clientes',
    registroId: id,
    detalles: { numero_documento: dto.numero_documento, razon_social_nombre: dto.razon_social_nombre },
    ip: ctx.ip,
  })

  return clienteRepository.findById(id)
}

/** Campos que se editan desde la pantalla de Gestión Administrativa. */
const CAMPOS_EDITABLES = [
  'tipo_documento', 'razon_social_nombre', 'nombre_contacto',
  'telefono', 'email', 'direccion',
]

/** Edita la ficha del cliente (Gestión Administrativa). */
export async function actualizarCliente(id, cambios = {}, ctx = {}) {
  const actual = await clienteRepository.findById(id)
  if (!actual) throw new AppError('Cliente no encontrado', 404)

  const campos = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo]
  }

  if (campos.tipo_documento !== undefined) {
    const tipo = String(campos.tipo_documento).toUpperCase()
    if (!TIPOS_DOCUMENTO.includes(tipo)) {
      throw new AppError(
        `tipo_documento debe ser uno de: ${TIPOS_DOCUMENTO.join(', ')}`,
        400,
        'tipo_documento',
      )
    }
    campos.tipo_documento = tipo
  }

  if (campos.razon_social_nombre !== undefined) {
    const nombre = String(campos.razon_social_nombre).trim()
    if (!nombre) {
      throw new AppError('La razón social no puede quedar vacía', 400, 'razon_social_nombre')
    }
    campos.razon_social_nombre = nombre
  }

  for (const campo of ['nombre_contacto', 'telefono', 'email', 'direccion']) {
    if (campos[campo] !== undefined) campos[campo] = textoOpcional(campos[campo])
  }

  revisarLargo(campos.nombre_contacto, LARGO.nombre_contacto, 'nombre_contacto')
  revisarLargo(campos.email, LARGO.email, 'email')
  revisarLargo(campos.telefono, LARGO.telefono, 'telefono')
  revisarLargo(campos.direccion, LARGO.direccion, 'direccion')
  revisarCorreo(campos.email)
  revisarTelefono(campos.telefono)

  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  await clienteRepository.update(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'clientes',
    registroId: Number(id),
    detalles: { cambios: campos },
    ip: ctx.ip,
  })

  return clienteRepository.findById(id)
}

/** HU-18 · RN07: el cliente se da de baja lógicamente, nunca se borra. */
const bajaReactivar = crearBajaReactivar({
  tabla: 'clientes',
  mensajes: {
    noEncontrado: 'Cliente no encontrado',
    yaDeBaja: 'El cliente ya estaba dado de baja',
    noEstaDeBaja: 'El cliente no está dado de baja',
  },
  buscar: (id) => clienteRepository.findById(id),
  detallesBaja: (cliente) => ({ numero_documento: cliente.numero_documento }),
})

export const darDeBajaCliente = bajaReactivar.darDeBaja
export const reactivarCliente = bajaReactivar.reactivar
