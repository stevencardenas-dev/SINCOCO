import { listarPrestamos, registrarEntrega, reemplazosPosibles, reemplazarHerramienta } from '../services/prestamoHerramientaService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) =>
  res.json(await listarPrestamos({ estado: req.query.estado, herramienta_id: req.query.herramienta_id })))

export const entregar = asyncHandler(async (req, res) =>
  res.status(201).json({ message: 'Entrega registrada', prestamo: await registrarEntrega(req.body, contexto(req)) }))

export const reemplazos = asyncHandler(async (req, res) => res.json(await reemplazosPosibles(req.params.id)))

export const reemplazar = asyncHandler(async (req, res) => {
  const r = await reemplazarHerramienta(req.params.id, req.body, contexto(req))
  res.status(201).json({
    message: r.sugerir_solicitud
      ? 'Avería registrada y préstamo cerrado sin reemplazo: registre una solicitud de herramienta'
      : 'Avería registrada: el reemplazo quedó entregado al trabajador',
    ...r,
  })
})
