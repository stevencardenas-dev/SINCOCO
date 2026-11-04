import * as repo from '../repositories/presupuestoMaterialRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import * as etapaRepository from '../repositories/etapaRepository.js'
import { verificarAccesoProyecto, verificarGestionPlan } from './accesoService.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

// cantidad_presupuestada es decimal(12,2).
const CANTIDAD_MAXIMA = 9_999_999_999.99

/** Actividad indicada con el proyecto al que pertenece. */
async function cargarActividad(id) {
  const actividad = await actividadRepository.findById(id)
  if (!actividad) throw new AppError('La actividad indicada no existe', 404)
  const etapa = await etapaRepository.findById(actividad.etapa_id)
  return { actividad, proyectoId: etapa.proyecto_id }
}

/** Valida las líneas: material indicado una sola vez y cantidad mayor que cero con hasta 2 decimales. */
function normalizarLineas(lineas) {
  if (!Array.isArray(lineas)) throw new AppError('Indique las líneas del presupuesto', 400, 'lineas')
  const vistos = new Set()
  return lineas.map((l, i) => {
    const materialId = Number(l?.material_id)
    if (!Number.isInteger(materialId) || materialId <= 0) {
      throw new AppError(`Seleccione el material de la línea ${i + 1}`, 400, `lineas[${i}].material_id`)
    }
    if (vistos.has(materialId)) throw new AppError(`El material de la línea ${i + 1} está repetido`, 400, `lineas[${i}].material_id`)
    vistos.add(materialId)
    const cantidad = Math.round(Number(l?.cantidad_presupuestada) * 100) / 100
    if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > CANTIDAD_MAXIMA) {
      throw new AppError(`La cantidad de la línea ${i + 1} debe ser mayor que cero`, 400, `lineas[${i}].cantidad_presupuestada`)
    }
    return { material_id: materialId, cantidad }
  })
}

/** Presupuesto de materiales de la actividad y los materiales disponibles para definirlo. */
export async function obtenerPresupuesto(actividadId, usuario) {
  const { proyectoId } = await cargarActividad(actividadId)
  await verificarAccesoProyecto(usuario, proyectoId)
  const [lineas, materiales] = await Promise.all([repo.listarPorActividad(actividadId), repo.catalogo(actividadId)])
  return { lineas, materiales }
}

/**
 * Define el presupuesto de materiales contra el que HU-08 (CU-08 Alt 1) compara lo solicitado.
 * Sin líneas la actividad queda sin presupuesto de materiales: no hay contra qué comparar.
 */
export async function guardarPresupuesto(actividadId, body = {}, ctx) {
  const { actividad, proyectoId } = await cargarActividad(actividadId)
  await verificarGestionPlan(ctx.usuario, proyectoId)
  const lineas = normalizarLineas(body.lineas)
  // Solo se ofrecen materiales activos, salvo los que la actividad ya tenía presupuestados.
  const disponibles = new Set((await repo.catalogo(actividadId)).map((m) => Number(m.id)))
  const invalido = lineas.find((l) => !disponibles.has(l.material_id))
  if (invalido) throw new AppError('Uno de los materiales no existe o está dado de baja', 400, 'lineas')
  await repo.reemplazar(actividadId, lineas)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR_PRESUPUESTO_MATERIALES', tabla: 'actividades', registroId: Number(actividadId),
    detalles: { actividad: actividad.nombre, lineas: lineas.length }, ip: ctx.ip,
  })
  return obtenerPresupuesto(actividadId, ctx.usuario)
}
