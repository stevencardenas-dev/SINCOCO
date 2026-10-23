import * as repo from '../repositories/alertaRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

export const TIPOS = ['STOCK_MINIMO', 'HERRAMIENTA_PENDIENTE', 'ACTIVIDAD_ATRASADA', 'INCIDENCIA_CRITICA']

/** HU-23: consulta de alertas (`atendida=0|1` filtra pendientes o atendidas). */
export async function listarAlertas({ tipo = '', atendida = '' } = {}) {
  const t = String(tipo ?? '').trim().toUpperCase()
  if (t && !TIPOS.includes(t)) throw new AppError(`tipo debe ser uno de: ${TIPOS.join(', ')}`, 400, 'tipo')
  let a = null
  if (String(atendida ?? '') !== '') {
    if (!['0', '1', 'true', 'false'].includes(String(atendida))) throw new AppError('atendida debe ser 0 o 1', 400, 'atendida')
    a = ['1', 'true'].includes(String(atendida))
  }
  return repo.listar({ tipo: t, atendida: a })
}

/** La alerta permanece pendiente hasta que bodega la gestiona. */
export async function atenderAlerta(id, ctx) {
  const alerta = await repo.findById(id)
  if (!alerta) throw new AppError('Alerta no encontrada', 404)
  if (!(await repo.atender(id))) throw new AppError('La alerta ya fue atendida', 409)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ATENDER_ALERTA', tabla: 'alertas', registroId: Number(id),
    detalles: { tipo: alerta.tipo, referencia_id: alerta.referencia_id }, ip: ctx.ip,
  })
  return repo.findById(id)
}

export const evaluarStockMinimo = (materialId, conn) => repo.evaluarStockMinimo(materialId, conn)
