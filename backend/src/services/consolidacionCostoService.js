import * as repo from '../repositories/consolidacionCostoRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-15 · consolidación del costo real de un proyecto.
 *
 * Costo real = materiales despachados (cantidad × costo unitario al momento)
 *            + servicios externos contratados (valor_contratado)
 *            + órdenes de compra asociadas (monto_total).
 *
 * La desviación se expresa en porcentaje frente al presupuesto inicial:
 * (costo real − presupuesto) / presupuesto × 100. Con presupuesto 0 no hay
 * porcentaje posible y se devuelve null en lugar de inventar un número.
 *
 * Cada ejecución guarda un corte, así el dashboard (HU-16), las desviaciones
 * (HU-39) y los reportes (HU-25) leen el último valor consolidado en lugar de
 * recalcularlo. Se puede ejecutar bajo demanda (POST) o desde un proceso
 * programado llamando a `consolidarTodos`.
 */

const num = (v) => Number(v ?? 0)

export function desviacion(costoReal, presupuesto) {
  const p = num(presupuesto)
  if (p <= 0) return null
  return Number((((num(costoReal) - p) / p) * 100).toFixed(2))
}

const conTotales = (fila) => ({
  costo_materiales: num(fila.materiales),
  costo_servicios: num(fila.servicios),
  costo_ordenes_compra: num(fila.ordenes_compra),
  costo_real: num(fila.materiales) + num(fila.servicios) + num(fila.ordenes_compra),
})

async function proyectoDeId(proyectoId) {
  const proyecto = await proyectoRepository.findById(Number(proyectoId))
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  return proyecto
}

/** Consolida el costo de un proyecto y guarda el corte. */
export async function consolidarProyecto(proyectoId, ctx = {}) {
  const proyecto = await proyectoDeId(proyectoId)
  const totales = conTotales(await repo.costosDeProyecto(proyecto.id))
  const presupuesto = num(proyecto.presupuesto_inicial)

  const datos = {
    proyecto_id: Number(proyecto.id),
    ...totales,
    presupuesto_inicial: presupuesto,
    desviacion_porcentaje: desviacion(totales.costo_real, presupuesto),
    consolidado_por_usuario_id: ctx.usuarioId ?? null,
  }

  const id = await repo.registrar(datos)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CONSOLIDAR_COSTO',
    tabla: 'consolidaciones_costo',
    registroId: id,
    detalles: {
      proyecto_id: datos.proyecto_id,
      costo_real: datos.costo_real,
      desviacion_porcentaje: datos.desviacion_porcentaje,
    },
    ip: ctx.ip,
  })

  return {
    id,
    proyecto: { id: Number(proyecto.id), codigo: proyecto.codigo, nombre: proyecto.nombre },
    ...datos,
  }
}

/** Último corte de un proyecto, con su desviación ya calculada. */
export async function ultimaConsolidacion(proyectoId) {
  const proyecto = await proyectoDeId(proyectoId)
  const ultima = await repo.ultimaDeProyecto(proyecto.id)
  return {
    proyecto: { id: Number(proyecto.id), codigo: proyecto.codigo, nombre: proyecto.nombre },
    presupuesto_inicial: num(proyecto.presupuesto_inicial),
    ultima,
    historial: await repo.historialDeProyecto(proyecto.id),
  }
}

/** Lista por proyecto para la pantalla de costos: presupuesto, costo y corte. */
export async function resumenCostos({ estado = '' } = {}) {
  const filas = await repo.resumenPorProyecto({ estado })
  return filas.map((f) => ({
    ...f,
    presupuesto_inicial: num(f.presupuesto_inicial),
    costo_real: f.costo_real === null || f.costo_real === undefined ? null : num(f.costo_real),
    desviacion_porcentaje:
      f.desviacion_porcentaje === null || f.desviacion_porcentaje === undefined
        ? null
        : num(f.desviacion_porcentaje),
  }))
}

/**
 * Consolidación programada: recorre los proyectos vigentes no finalizados.
 * Devuelve el detalle de cada corte para que el proceso que la invoca lo
 * registre en su log.
 */
export async function consolidarTodos(ctx = {}) {
  const proyectos = await repo.resumenPorProyecto({})
  const pendientes = proyectos.filter((p) => !['FINALIZADO', 'CANCELADO'].includes(p.estado))
  const resultados = []
  for (const p of pendientes) {
    resultados.push(await consolidarProyecto(p.id, ctx))
  }
  return { consolidados: resultados.length, resultados }
}
