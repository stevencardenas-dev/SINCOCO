import * as catalogoRepository from '../repositories/catalogoRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { darDeBaja, reactivar } from '../db/bajaLogica.js'
import { AppError } from '../utils/AppError.js'

/**
 * Catálogos del personal (HU-04): cargos de la empresa y especialidades.
 *
 * Los dos catálogos se administran igual (crear, editar, dar de baja y
 * reactivar), así que el servicio trabaja sobre un descriptor: el controlador
 * solo decide cuál de los dos según la ruta.
 *
 * Ninguna operación borra filas: dar de baja marca `activo = 0` y conserva la
 * relación con los trabajadores que ya usaban el valor (HU-18 · RN07).
 *
 * `categoria` agrupa los valores en los selectores de la interfaz. Es opcional
 * (los cargos migrados del texto libre pueden no tenerla) y, si llega, debe ser
 * una de la lista. La misma lista vive en frontend/src/lib/catalogos.js.
 */
export const CATEGORIAS_CARGO = ['Directivo / Técnico', 'Administrativo', 'Operativo / Obra']

export const CATEGORIAS_ESPECIALIDAD = [
  'Obra Negra y Gris (Estructura)',
  'Instalaciones (MEP)',
  'Acabados y Detalles',
  'Trabajos Especializados',
  'Seguridad y Logística',
]

const CATALOGOS = {
  cargos: {
    tabla: 'cargos',
    etiqueta: 'cargo',
    categorias: CATEGORIAS_CARGO,
    tieneOperativo: true,
    listar: catalogoRepository.listarCargos,
    findById: catalogoRepository.findCargoById,
    findByNombre: catalogoRepository.findCargoPorNombre,
    crear: catalogoRepository.crearCargo,
    actualizar: catalogoRepository.actualizarCargo,
  },
  especialidades: {
    tabla: 'especialidades',
    etiqueta: 'especialidad',
    categorias: CATEGORIAS_ESPECIALIDAD,
    tieneOperativo: false,
    listar: catalogoRepository.listarEspecialidades,
    findById: catalogoRepository.findEspecialidadById,
    findByNombre: catalogoRepository.findEspecialidadPorNombre,
    crear: catalogoRepository.crearEspecialidad,
    actualizar: catalogoRepository.actualizarEspecialidad,
  },
}

/** Valida el nombre del catálogo recibido por la ruta. */
export function descriptor(tipo) {
  const def = CATALOGOS[tipo]
  if (!def) throw new AppError('Catálogo no encontrado', 404)
  return def
}

export async function listarCatalogo(tipo, { incluirInactivos = false } = {}) {
  return descriptor(tipo).listar(incluirInactivos)
}

export async function obtenerCatalogo(tipo, id) {
  const def = descriptor(tipo)
  const fila = await def.findById(id)
  if (!fila) throw new AppError(`El ${def.etiqueta} no existe`, 404)
  return fila
}

function validarNombre(def, nombre) {
  const limpio = nombre === undefined || nombre === null ? '' : String(nombre).trim()
  if (limpio.length < 3 || limpio.length > 100) {
    throw new AppError(`El nombre del ${def.etiqueta} debe tener entre 3 y 100 caracteres`, 400, 'nombre')
  }
  return limpio
}

function validarDescripcion(descripcion) {
  if (descripcion === undefined || descripcion === null || String(descripcion).trim() === '') return null
  const limpio = String(descripcion).trim()
  if (limpio.length > 255) {
    throw new AppError('La descripción no puede superar los 255 caracteres', 400, 'descripcion')
  }
  return limpio
}

/** Categoría opcional: vacía queda sin categoría; si llega, debe ser de la lista. */
function validarCategoria(def, categoria) {
  if (categoria === undefined || categoria === null || String(categoria).trim() === '') return null
  const limpio = String(categoria).trim()
  if (!def.categorias.includes(limpio)) {
    throw new AppError(
      `La categoría del ${def.etiqueta} debe ser una de: ${def.categorias.join(', ')}`,
      400,
      'categoria',
    )
  }
  return limpio
}

/** `operativo` llega como booleano del formulario o como 1/0 de un cliente API. */
function validarOperativo(valor) {
  return valor === true || valor === 1 || valor === '1' || valor === 'true' || valor === 'on'
}

async function exigirNombreLibre(def, nombre, idActual = null) {
  const existente = await def.findByNombre(nombre)
  if (existente && Number(existente.id) !== Number(idActual)) {
    throw new AppError(`Ya existe un ${def.etiqueta} con ese nombre`, 409, 'nombre')
  }
}

export async function crearCatalogo(tipo, body = {}, ctx = {}) {
  const def = descriptor(tipo)
  const nombre = validarNombre(def, body.nombre)
  await exigirNombreLibre(def, nombre)

  const datos = {
    nombre,
    descripcion: validarDescripcion(body.descripcion),
    categoria: validarCategoria(def, body.categoria),
  }
  if (def.tieneOperativo) datos.operativo = validarOperativo(body.operativo)

  const id = await def.crear(datos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: def.tabla,
    registroId: id,
    detalles: { nombre },
    ip: ctx.ip,
  })

  return def.findById(id)
}

export async function actualizarCatalogo(tipo, id, body = {}, ctx = {}) {
  const def = descriptor(tipo)
  const actual = await def.findById(id)
  if (!actual) throw new AppError(`El ${def.etiqueta} no existe`, 404)

  const campos = {}
  if (body.nombre !== undefined) {
    campos.nombre = validarNombre(def, body.nombre)
    await exigirNombreLibre(def, campos.nombre, id)
  }
  if (body.descripcion !== undefined) campos.descripcion = validarDescripcion(body.descripcion)
  if (body.categoria !== undefined) campos.categoria = validarCategoria(def, body.categoria)
  if (def.tieneOperativo && body.operativo !== undefined) {
    campos.operativo = validarOperativo(body.operativo) ? 1 : 0
  }
  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  await def.actualizar(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: def.tabla,
    registroId: Number(id),
    detalles: { cambios: campos },
    ip: ctx.ip,
  })

  return def.findById(id)
}

/**
 * "Eliminar" en la interfaz es dar de baja lógica: el valor desaparece de los
 * formularios pero los trabajadores que ya lo tienen registrado no pierden el
 * dato (RN07 · HU-18).
 */
export async function darDeBajaCatalogo(tipo, id, ctx = {}) {
  const def = descriptor(tipo)
  const actual = await def.findById(id)
  if (!actual) throw new AppError(`El ${def.etiqueta} no existe`, 404)

  const afectadas = await darDeBaja({ tabla: def.tabla, id, usuarioId: ctx.usuarioId })
  if (!afectadas) throw new AppError(`El ${def.etiqueta} ya estaba dado de baja`, 409)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'DAR_DE_BAJA',
    tabla: def.tabla,
    registroId: Number(id),
    detalles: { nombre: actual.nombre, en_uso: Number(actual.en_uso) },
    ip: ctx.ip,
  })

  return { id: Number(id), activo: 0 }
}

export async function reactivarCatalogo(tipo, id, ctx = {}) {
  const def = descriptor(tipo)
  const afectadas = await reactivar({ tabla: def.tabla, id })
  if (!afectadas) throw new AppError(`El ${def.etiqueta} no está dado de baja`, 409)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'REACTIVAR',
    tabla: def.tabla,
    registroId: Number(id),
    ip: ctx.ip,
  })

  return { id: Number(id), activo: 1 }
}

/**
 * HU-04: el cargo de un trabajador tiene que existir en el catálogo. Se acepta
 * el id o el nombre (la interfaz manda el id; las pruebas y los clientes de API
 * antiguos mandan el nombre).
 */
export async function resolverCargo({ cargo_id, cargo }) {
  const fila = cargo_id
    ? await catalogoRepository.findCargoById(cargo_id)
    : cargo
      ? await catalogoRepository.findCargoPorNombre(cargo)
      : null

  if (!fila) {
    throw new AppError(
      `El cargo no está en el catálogo de cargos${cargo ? `: ${cargo}` : ''}. Regístrelo en Gestión Administrativa.`,
      400,
      'cargo',
    )
  }
  if (!fila.activo) {
    throw new AppError(`El cargo "${fila.nombre}" está dado de baja en el catálogo`, 400, 'cargo')
  }
  return fila
}

/**
 * La especialidad es opcional (solo se exige en cargos operativos), así que
 * devuelve null cuando no viene ninguna.
 */
export async function resolverEspecialidad({ especialidad_id, especialidad }) {
  const vacio =
    (especialidad_id === undefined || especialidad_id === null || especialidad_id === '') &&
    (especialidad === undefined || especialidad === null || String(especialidad).trim() === '')
  if (vacio) return null

  const fila = especialidad_id
    ? await catalogoRepository.findEspecialidadById(especialidad_id)
    : await catalogoRepository.findEspecialidadPorNombre(especialidad)

  if (!fila) {
    throw new AppError(
      `La especialidad no está en el catálogo${especialidad ? `: ${especialidad}` : ''}. Regístrela en Gestión Administrativa.`,
      400,
      'especialidad',
    )
  }
  if (!fila.activo) {
    throw new AppError(`La especialidad "${fila.nombre}" está dada de baja en el catálogo`, 400, 'especialidad')
  }
  return fila
}
