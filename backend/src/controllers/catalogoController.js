import {
  descriptor,
  listarCatalogo,
  obtenerCatalogo,
  crearCatalogo,
  actualizarCatalogo,
  darDeBajaCatalogo,
  reactivarCatalogo,
} from '../services/catalogoService.js'

/**
 * Catálogos del personal (HU-04): `/api/catalogos/cargos` y
 * `/api/catalogos/especialidades`.
 *
 * El `tipo` de la ruta decide cuál de los dos catálogos se administra; el
 * servicio valida que exista (404 si no).
 */
const ctx = (req) => ({ usuarioId: req.user.id, ip: req.ip })

const incluirInactivos = (req) =>
  ['1', 'true', 'on'].includes(String(req.query.incluirInactivos))

export async function listar(req, res, next) {
  try {
    const filas = await listarCatalogo(req.params.tipo, { incluirInactivos: incluirInactivos(req) })
    return res.json(filas)
  } catch (error) {
    return next(error)
  }
}

export async function obtener(req, res, next) {
  try {
    return res.json(await obtenerCatalogo(req.params.tipo, req.params.id))
  } catch (error) {
    return next(error)
  }
}

export async function crear(req, res, next) {
  try {
    const { etiqueta } = descriptor(req.params.tipo)
    const fila = await crearCatalogo(req.params.tipo, req.body, ctx(req))
    return res.status(201).json({ message: `Se registró el ${etiqueta}`, [etiqueta]: fila })
  } catch (error) {
    return next(error)
  }
}

export async function actualizar(req, res, next) {
  try {
    const { etiqueta } = descriptor(req.params.tipo)
    const fila = await actualizarCatalogo(req.params.tipo, req.params.id, req.body, ctx(req))
    return res.json({ message: `Se actualizó el ${etiqueta}`, [etiqueta]: fila })
  } catch (error) {
    return next(error)
  }
}

export async function baja(req, res, next) {
  try {
    const { etiqueta } = descriptor(req.params.tipo)
    const resultado = await darDeBajaCatalogo(req.params.tipo, req.params.id, ctx(req))
    return res.json({ message: `Se dio de baja el ${etiqueta}`, ...resultado })
  } catch (error) {
    return next(error)
  }
}

export async function reactivarCtrl(req, res, next) {
  try {
    const { etiqueta } = descriptor(req.params.tipo)
    const resultado = await reactivarCatalogo(req.params.tipo, req.params.id, ctx(req))
    return res.json({ message: `Se reactivó el ${etiqueta}`, ...resultado })
  } catch (error) {
    return next(error)
  }
}
