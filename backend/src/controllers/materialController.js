import {
  listarMateriales,
  listarCategorias,
  listarUnidadesMedida,
  obtenerMaterial,
  registrarMaterial,
  actualizarMaterial,
  darDeBajaMaterial,
  reactivarMaterial,
} from '../services/materialService.js'
import { RegistrarMaterialDto } from '../dtos/material/RegistrarMaterialDto.js'
import { asyncHandler, contexto } from '../utils/http.js'

const verdadero = (v) => ['1', 'true', 'on'].includes(String(v))

/**
 * GET /api/materiales -> catálogo de materiales (HU-07).
 * `?buscar=` `?categoria_id=` filtran; `?bajo_minimo=1` deja los que están en
 * o bajo su nivel mínimo; `?incluirInactivos=1` incluye los dados de baja (HU-18).
 */
export const listar = asyncHandler(async (req, res) => {
  return res.json(
    await listarMateriales({
      incluirInactivos: verdadero(req.query.incluirInactivos),
      buscar: req.query.buscar ?? req.query.q ?? '',
      categoriaId: req.query.categoria_id || null,
      bajoMinimo: verdadero(req.query.bajo_minimo),
    }),
  )
})

export const obtener = asyncHandler(async (req, res) => {
  return res.json(await obtenerMaterial(req.params.id))
})

/** GET /api/materiales/categorias -> categorías para el selector. */
export const categorias = asyncHandler(async (req, res) => {
  return res.json(await listarCategorias())
})

/** GET /api/materiales/unidades -> unidades de medida válidas. */
export const unidades = asyncHandler(async (req, res) => {
  return res.json(listarUnidadesMedida())
})

export const registrar = asyncHandler(async (req, res) => {
  const dto = RegistrarMaterialDto.fromRequestBody(req.body)
  const material = await registrarMaterial(dto, contexto(req))
  return res.status(201).json({ message: 'Material registrado correctamente', material })
})

export const actualizar = asyncHandler(async (req, res) => {
  const material = await actualizarMaterial(req.params.id, req.body, contexto(req))
  return res.json({ message: 'Material actualizado', material })
})

export const baja = asyncHandler(async (req, res) => {
  const resultado = await darDeBajaMaterial(req.params.id, contexto(req))
  return res.json({ message: 'Material dado de baja', ...resultado })
})

export const reactivarCtrl = asyncHandler(async (req, res) => {
  const resultado = await reactivarMaterial(req.params.id, contexto(req))
  return res.json({ message: 'Material reactivado', ...resultado })
})
