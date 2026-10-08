import * as materialRepository from '../repositories/materialRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { numeroOpcional } from '../utils/campos.js'
import {
  UNIDADES_MEDIDA,
  revisarCodigo,
  revisarDescripcion,
  revisarUnidadMedida,
  revisarMonto,
} from '../dtos/material/RegistrarMaterialDto.js'

/** HU-07: catálogo de materiales (activos por defecto; filtros en el repositorio). */
export async function listarMateriales(filtros = {}) {
  return materialRepository.listar(filtros)
}

export async function listarCategorias() {
  return materialRepository.listarCategorias()
}

export function listarUnidadesMedida() {
  return UNIDADES_MEDIDA
}

export async function obtenerMaterial(id) {
  const material = await materialRepository.findById(id)
  if (!material) throw new AppError('Material no encontrado', 404)
  return material
}

/** HU-07 · criterio 2: la categoría debe existir. */
async function exigirCategoria(categoriaId) {
  const categoria = await materialRepository.findCategoria(categoriaId)
  if (!categoria) throw new AppError('La categoría seleccionada no existe', 400, 'categoria_id')
  return categoria
}

/**
 * HU-07 · criterio 1 / CU-07 Alt 1: el código no puede repetirse; se sugiere
 * editar el material existente en lugar de crear un duplicado.
 */
async function exigirCodigoLibre(codigo, idActual = null) {
  const existente = await materialRepository.findByCodigo(codigo)
  if (existente && Number(existente.id) !== Number(idActual)) {
    throw new AppError(
      `Ya existe un material con el código ${codigo} (id ${existente.id}); edite el material existente en lugar de crear uno duplicado`,
      409,
      'codigo',
    )
  }
}

export async function registrarMaterial(dto, ctx = {}) {
  await exigirCodigoLibre(dto.codigo)
  const categoria = await exigirCategoria(dto.categoria_id)

  const id = await materialRepository.create(dto)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'materiales',
    registroId: id,
    detalles: { codigo: dto.codigo, categoria: categoria.nombre },
    ip: ctx.ip,
  })
  return materialRepository.findById(id)
}

/**
 * CU-07 Alt 2: editar conserva el histórico de movimientos (nada se borra).
 * `existencia_total` no se escribe a mano: la mueven las entradas, salidas,
 * traslados y devoluciones (HU-07 · criterio 4).
 */
export async function actualizarMaterial(id, cambios = {}, ctx = {}) {
  const actual = await obtenerMaterial(id)
  if (!actual.activo) {
    throw new AppError('El material está dado de baja; reactívelo antes de editarlo', 409)
  }
  if (cambios.existencia_total !== undefined) {
    throw new AppError(
      'La existencia solo cambia con los procesos de entrada, salida, traslado o devolución de inventario',
      400,
      'existencia_total',
    )
  }

  const campos = {}
  if (cambios.codigo !== undefined) {
    campos.codigo = revisarCodigo(cambios.codigo)
    await exigirCodigoLibre(campos.codigo, id)
  }
  if (cambios.categoria_id !== undefined) {
    const categoriaId = numeroOpcional(cambios.categoria_id, 'categoria_id')
    if (!categoriaId) throw new AppError('Debe seleccionar la categoría del material', 400, 'categoria_id')
    await exigirCategoria(categoriaId)
    campos.categoria_id = categoriaId
  }
  if (cambios.descripcion !== undefined) campos.descripcion = revisarDescripcion(cambios.descripcion)
  if (cambios.unidad_medida !== undefined) campos.unidad_medida = revisarUnidadMedida(cambios.unidad_medida)
  if (cambios.costo_referencia !== undefined) {
    campos.costo_referencia = revisarMonto(cambios.costo_referencia, 'costo_referencia')
  }
  if (cambios.nivel_minimo !== undefined) {
    campos.nivel_minimo = revisarMonto(cambios.nivel_minimo, 'nivel_minimo')
  }

  if (Object.keys(campos).length === 0) {
    throw new AppError('No hay campos que actualizar', 400)
  }

  await materialRepository.update(id, campos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ACTUALIZAR',
    tabla: 'materiales',
    registroId: Number(id),
    detalles: { codigo: actual.codigo, cambios: campos },
    ip: ctx.ip,
  })
  return materialRepository.findById(id)
}

/**
 * HU-18: baja lógica. No se permite mientras haya existencia en bodega: el
 * stock quedaría fuera del catálogo sin que nadie pueda moverlo.
 */
export async function darDeBajaMaterial(id, ctx = {}) {
  const material = await obtenerMaterial(id)
  if (!material.activo) throw new AppError('El material ya estaba dado de baja', 409)
  if (material.existencia_total > 0) {
    throw new AppError(
      `No se puede dar de baja: el material tiene ${material.existencia_total} ${material.unidad_medida} en existencia. Registre primero su salida o traslado.`,
      409,
    )
  }

  const afectadas = await materialRepository.darDeBaja(id, ctx.usuarioId)
  if (!afectadas) throw new AppError('El material ya estaba dado de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'DAR_DE_BAJA',
    tabla: 'materiales',
    registroId: Number(id),
    detalles: { codigo: material.codigo },
    ip: ctx.ip,
  })
  return { id: Number(id), activo: 0, estado: 'INACTIVO' }
}

export async function reactivarMaterial(id, ctx = {}) {
  await obtenerMaterial(id)
  const afectadas = await materialRepository.reactivar(id)
  if (!afectadas) throw new AppError('El material no está dado de baja', 409)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'REACTIVAR',
    tabla: 'materiales',
    registroId: Number(id),
    ip: ctx.ip,
  })
  return { id: Number(id), activo: 1, estado: 'ACTIVO' }
}
