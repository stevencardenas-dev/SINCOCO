import { listarAlertas, atenderAlerta } from '../services/alertaService.js'
import { evaluarAtrasos, recordarAlerta } from '../services/alertaOperativaService.js'
import { asyncHandler, contexto } from '../utils/http.js'

export const listar = asyncHandler(async (req, res) =>
  res.json(await listarAlertas({ tipo: req.query.tipo, atendida: req.query.atendida })))

export const atender = asyncHandler(async (req, res) =>
  res.json({ message: 'Alerta atendida', alerta: await atenderAlerta(req.params.id, contexto(req)) }))

/** HU-24 · POST /api/alertas/evaluar -> genera las alertas de atraso y vencimiento. */
export const evaluar = asyncHandler(async (req, res) => {
  const r = await evaluarAtrasos()
  return res.status(r.creadas > 0 ? 201 : 200).json({
    message:
      r.creadas === 0
        ? 'No hay atrasos nuevos: las alertas pendientes ya estaban generadas'
        : `${r.creadas} ${r.creadas === 1 ? 'alerta nueva' : 'alertas nuevas'} de atraso`,
    ...r,
  })
})

/** HU-24 · POST /api/alertas/:id/recordatorio -> correo al responsable. */
export const recordar = asyncHandler(async (req, res) =>
  res.json({ message: 'Recordatorio enviado al responsable', ...(await recordarAlerta(req.params.id, contexto(req))) }))
