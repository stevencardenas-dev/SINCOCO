import {
  descriptor,
  listarCatalogo,
  obtenerCatalogo,
  crearCatalogo,
  actualizarCatalogo,
  darDeBajaCatalogo,
  reactivarCatalogo,
} from '../services/catalogoService.js'
import { asyncHandler, contexto } from '../utils/http.js'

/**
 * Catálogos del personal (HU-04): `/api/catalogos/cargos` y
 * `/api/catalogos/especialidades`.
 *
 * El `tipo` de la ruta decide cuál de los dos catálogos se administra; el
 * servicio valida que exista (404 si no).
 */
const ctx = contexto

const incluirInactivos = (req) =>
  ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))

export const listar = asyncHandler(async (req, res) => {
  const filas = await listarCatalogo(req.params.tipo, { incluirInactivos: incluirInactivos(req) })
  return res.json(filas)
})

export const obtener = asyncHandler(async (req, res) => {
  return res.json(await obtenerCatalogo(req.params.tipo, req.params.id))
})

export const crear = asyncHandler(async (req, res) => {
  const { etiqueta } = descriptor(req.params.tipo)
  const fila = await crearCatalogo(req.params.tipo, req.body, ctx(req))
  return res.status(201).json({ message: `Se registró el ${etiqueta}`, [etiqueta]: fila })
})

export const actualizar = asyncHandler(async (req, res) => {
  const { etiqueta } = descriptor(req.params.tipo)
  const fila = await actualizarCatalogo(req.params.tipo, req.params.id, req.body, ctx(req))
  return res.json({ message: `Se actualizó el ${etiqueta}`, [etiqueta]: fila })
})

export const baja = asyncHandler(async (req, res) => {
  const { etiqueta } = descriptor(req.params.tipo)
  const resultado = await darDeBajaCatalogo(req.params.tipo, req.params.id, ctx(req))
  return res.json({ message: `Se dio de baja el ${etiqueta}`, ...resultado })
})

export const reactivarCtrl = asyncHandler(async (req, res) => {
  const { etiqueta } = descriptor(req.params.tipo)
  const resultado = await reactivarCatalogo(req.params.tipo, req.params.id, ctx(req))
  return res.json({ message: `Se reactivó el ${etiqueta}`, ...resultado })
})
