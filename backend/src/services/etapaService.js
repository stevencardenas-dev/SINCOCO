import * as etapaRepository from '../repositories/etapaRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import * as actividadRepository from '../repositories/actividadRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { crearBajaReactivar } from './bajaReactivar.js'
import { AppError } from '../utils/AppError.js'
import { aFechaDia, rangosSeSolapan, validarFechasEnRango } from '../utils/fechas.js'
import { verificarAccesoProyecto, verificarGestionPlan } from './accesoService.js'

// La regla de fechas vive en utils/fechas.js (la comparten etapas, actividades
// y asignaciones). Se reexporta para no romper a quien ya la importaba de aquí.
export { validarFechasEnRango }

/** Lista las etapas del proyecto si el usuario tiene acceso a él (RBAC). */
export async function listarEtapas(proyectoId, { incluirInactivos = false } = {}, usuario = null) {
  await verificarAccesoProyecto(usuario, proyectoId)
  return etapaRepository.listarPorProyecto(proyectoId, incluirInactivos)
}

/**
 * Las etapas de un proyecto se ejecutan una tras otra: ninguna puede compartir
 * días con otra etapa activa del mismo proyecto.
 */
async function validarSinSolape(proyectoId, inicio, fin, { excluirId = null } = {}) {
  const etapas = await etapaRepository.listarPorProyecto(proyectoId)
  for (const otra of etapas) {
    if (excluirId !== null && Number(otra.id) === Number(excluirId)) continue
    const oInicio = aFechaDia(otra.fecha_inicio_programada)
    const oFin = aFechaDia(otra.fecha_fin_programada)
    if (!oInicio || !oFin) continue
    if (rangosSeSolapan(inicio, fin, oInicio, oFin)) {
      throw new AppError(
        `Las fechas se solapan con la etapa «${otra.nombre}» (${oInicio} a ${oFin})`,
        400,
        'fecha_inicio_programada',
      )
    }
  }
}

/**
 * HU-03: define una etapa dentro de un proyecto existente. El orden no lo elige
 * el usuario: se calcula según la fecha de inicio de las etapas del plan.
 * Criterio 5: el estado inicial es PENDIENTE.
 */
export async function registrarEtapa(dto, ctx = {}) {
  const proyecto = await proyectoRepository.findById(dto.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  await verificarGestionPlan(ctx.usuario, dto.proyecto_id)
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 400, 'proyecto_id')

  validarFechasEnRango(dto.fecha_inicio_programada, dto.fecha_fin_programada, proyecto, 'la etapa')
  await validarSinSolape(dto.proyecto_id, dto.fecha_inicio_programada, dto.fecha_fin_programada)

  const id = await etapaRepository.create({
    proyecto_id: dto.proyecto_id,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    orden: (await etapaRepository.maxOrden(dto.proyecto_id)) + 1,
    fecha_inicio_programada: dto.fecha_inicio_programada,
    fecha_fin_programada: dto.fecha_fin_programada,
    estado: 'PENDIENTE',
  })
  await etapaRepository.renumerar(dto.proyecto_id)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'etapas_proyecto',
    registroId: id,
    detalles: { proyecto_id: dto.proyecto_id, nombre: dto.nombre },
    ip: ctx.ip,
  })

  return etapaRepository.findById(id)
}

/**
 * Edita las propiedades de una etapa. Si cambian sus fechas se revalidan contra
 * el proyecto, contra las demás etapas y contra sus propias actividades (que no
 * pueden quedar fuera del nuevo rango); el orden se recalcula solo.
 */
export async function actualizarEtapa(id, dto, ctx = {}) {
  const etapa = await etapaRepository.findById(id)
  if (!etapa) throw new AppError('Etapa no encontrada', 404)
  await verificarGestionPlan(ctx.usuario, etapa.proyecto_id)
  if (!etapa.activo) throw new AppError('La etapa está dada de baja', 400)
  const proyecto = await proyectoRepository.findById(etapa.proyecto_id)

  const campos = { ...dto.campos }
  const inicio = aFechaDia(campos.fecha_inicio_programada ?? etapa.fecha_inicio_programada)
  const fin = aFechaDia(campos.fecha_fin_programada ?? etapa.fecha_fin_programada)
  if (!inicio || !fin) {
    throw new AppError('La etapa necesita fecha de inicio y de fin', 400, 'fecha_inicio_programada')
  }
  const cambiaFechas = inicio !== aFechaDia(etapa.fecha_inicio_programada)
    || fin !== aFechaDia(etapa.fecha_fin_programada)

  if (cambiaFechas) {
    validarFechasEnRango(inicio, fin, proyecto, 'la etapa')
    await validarSinSolape(etapa.proyecto_id, inicio, fin, { excluirId: id })

    const actividades = await actividadRepository.listarPorEtapa(id)
    const fuera = actividades.find(
      (a) => aFechaDia(a.fecha_inicio_programada) < inicio || aFechaDia(a.fecha_fin_programada) > fin,
    )
    if (fuera) {
      throw new AppError(
        `La actividad «${fuera.nombre}» (${aFechaDia(fuera.fecha_inicio_programada)} a ${aFechaDia(fuera.fecha_fin_programada)}) quedaría fuera de las nuevas fechas de la etapa; ajústela primero`,
        400,
        'fecha_inicio_programada',
      )
    }
  }

  await etapaRepository.update(id, campos)
  if (cambiaFechas) await etapaRepository.renumerar(etapa.proyecto_id)

  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'ACTUALIZAR', tabla: 'etapas_proyecto',
    registroId: Number(id), detalles: { nombre: etapa.nombre, cambios: campos }, ip: ctx.ip,
  })
  return etapaRepository.findById(id)
}

/**
 * HU-18: baja y reactivación de etapas. Las etapas restantes se renumeran
 * después de cada cambio; al reactivar, el rango no puede haberse ocupado
 * mientras la etapa estuvo de baja.
 */
const bajaReactivar = crearBajaReactivar({
  tabla: 'etapas_proyecto',
  mensajes: {
    noEncontrado: 'Etapa no encontrada',
    yaDeBaja: 'La etapa ya estaba dada de baja',
    noEstaDeBaja: 'La etapa no está dada de baja',
  },
  buscar: (id) => etapaRepository.findById(id),
  verificar: (etapa, ctx) => verificarGestionPlan(ctx.usuario, etapa.proyecto_id),
  detallesBaja: (etapa) => ({ nombre: etapa.nombre }),
  antesDeReactivar: async (etapa, id) => {
    const inicio = aFechaDia(etapa.fecha_inicio_programada)
    const fin = aFechaDia(etapa.fecha_fin_programada)
    if (inicio && fin) await validarSinSolape(etapa.proyecto_id, inicio, fin, { excluirId: id })
  },
  despues: (etapa) => etapaRepository.renumerar(etapa.proyecto_id),
})

export const darDeBajaEtapa = bajaReactivar.darDeBaja
export const reactivarEtapa = bajaReactivar.reactivar
