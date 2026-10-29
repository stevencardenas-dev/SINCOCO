import { listarEntradas, obtenerEntrada, registrarEntrada, ordenesRecibibles, proveedoresParaIngreso } from '../services/entradaInventarioService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) => res.json(await listarEntradas()))
export const ordenes = asyncHandler(async (req, res) => res.json(await ordenesRecibibles()))
export const proveedores = asyncHandler(async (req, res) => res.json(await proveedoresParaIngreso()))
export const obtener =asyncHandler(async (req, res) => res.json(await obtenerEntrada(req.params.id)))

export const registrar = asyncHandler(async (req, res) =>
  res.status(201).json({ message: 'Ingreso registrado', entrada: await registrarEntrada(req.body, contexto(req)) }))
