import * as plantillaRepository from '../repositories/plantillaEtapaRepository.js'
import * as etapaRepository from '../repositories/etapaRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { verificarGestionPlan } from './accesoService.js'

/** Plantillas de etapas disponibles (el permiso lo exige la ruta). */
export function listarPlantillas() {
  return plantillaRepository.listarActivas()
}

const normalizar = (t) => String(t).trim().toLowerCase()

/**
 * Aplica una plantilla a un proyecto: crea sus etapas con nombre y orden,
 * PENDIENTE y sin fechas ni peso. Nunca borra ni sobrescribe.
 *
 * Si el proyecto ya tiene etapas activas exige `confirmar` y las nuevas se
 * agregan al final; las que repiten el nombre de una etapa existente se omiten
 * para no duplicar.
 */
export async function aplicarPlantilla(dto, ctx = {}) {
  const proyecto = await proyectoRepository.findById(dto.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  await verificarGestionPlan(ctx.usuario, dto.proyecto_id)
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 400, 'proyecto_id')

  const plantilla = await plantillaRepository.findActivaById(dto.plantilla_id)
  if (!plantilla) throw new AppError('La plantilla indicada no existe', 404, 'plantilla_id')

  const existentes = await etapaRepository.listarPorProyecto(dto.proyecto_id)
  if (existentes.length > 0 && !dto.confirmar) {
    throw new AppError(
      `El proyecto ya tiene ${existentes.length} etapa(s). Las de la plantilla se agregarían al final, sin modificar las existentes.`,
      409,
      'plantilla_id',
      { codigo: 'CONFIRMAR_PLANTILLA', etapas_existentes: existentes.length },
    )
  }

  const nombres = new Set(existentes.map((e) => normalizar(e.nombre)))
  const nuevas = plantilla.etapas.filter((e) => !nombres.has(normalizar(e.nombre)))
  const omitidas = plantilla.etapas.filter((e) => nombres.has(normalizar(e.nombre))).map((e) => e.nombre)
  if (nuevas.length === 0) {
    throw new AppError('El proyecto ya tiene todas las etapas de esta plantilla', 409, 'plantilla_id')
  }

  const ids = await plantillaRepository.crearEtapasDePlantilla(dto.proyecto_id, nuevas)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'APLICAR_PLANTILLA',
    tabla: 'etapas_proyecto',
    registroId: dto.proyecto_id,
    detalles: { proyecto_id: dto.proyecto_id, plantilla: plantilla.nombre, etapas_creadas: ids.length, omitidas },
    ip: ctx.ip,
  })

  return {
    plantilla: plantilla.nombre,
    creadas: ids.length,
    omitidas,
    etapas: await etapaRepository.listarPorProyecto(dto.proyecto_id),
  }
}
