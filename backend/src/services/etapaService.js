import * as etapaRepository from '../repositories/etapaRepository.js'
import * as proyectoRepository from '../repositories/proyectoRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * Normaliza una fecha a 'YYYY-MM-DD' para comparar solo el día.
 * Las columnas DATE vuelven como Date (medianoche local) y las del formulario
 * como texto, así que no se pueden comparar directamente sin caer en
 * diferencias de zona horaria.
 */
function aFechaDia(valor) {
  if (!valor) return null
  if (typeof valor === 'string') return valor.slice(0, 10)
  const d = new Date(valor)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/**
 * HU-03 · criterio 3: las fechas programadas de etapas y actividades deben
 * mantenerse dentro del rango de fechas del proyecto.
 */
export function validarFechasEnRango(inicio, fin, proyecto) {
  const pInicio = aFechaDia(proyecto.fecha_inicio_programada)
  const pFin = aFechaDia(proyecto.fecha_fin_programada)

  for (const [campo, valor] of [['fecha_inicio_programada', inicio], ['fecha_fin_programada', fin]]) {
    const f = aFechaDia(valor)
    if (!f) continue
    if (pInicio && f < pInicio) {
      throw new AppError('La fecha no puede ser anterior al inicio del proyecto', 400, campo)
    }
    if (pFin && f > pFin) {
      throw new AppError('La fecha no puede ser posterior al fin del proyecto', 400, campo)
    }
  }

  const i = aFechaDia(inicio)
  const f = aFechaDia(fin)
  if (i && f && i > f) {
    throw new AppError(
      'La fecha de inicio de la actividad debe ser anterior a la de fin',
      400,
      'fecha_fin_programada',
    )
  }
}

export async function listarEtapas(proyectoId, { incluirInactivos = false } = {}) {
  return etapaRepository.listarPorProyecto(proyectoId, incluirInactivos)
}

/**
 * HU-03: define una etapa dentro de un proyecto existente. El `orden` permite
 * fijar su secuencia; si no se indica, se coloca al final del plan.
 * Criterio 5: el estado inicial es PENDIENTE.
 */
export async function registrarEtapa(dto, ctx = {}) {
  const proyecto = await proyectoRepository.findById(dto.proyecto_id)
  if (!proyecto) throw new AppError('El proyecto indicado no existe', 404, 'proyecto_id')
  if (!proyecto.activo) throw new AppError('El proyecto está dado de baja', 400, 'proyecto_id')

  validarFechasEnRango(dto.fecha_inicio_programada, dto.fecha_fin_programada, proyecto)

  const orden = dto.orden ?? (await etapaRepository.maxOrden(dto.proyecto_id)) + 1

  const id = await etapaRepository.create({
    proyecto_id: dto.proyecto_id,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    orden,
    fecha_inicio_programada: dto.fecha_inicio_programada,
    fecha_fin_programada: dto.fecha_fin_programada,
    estado: 'PENDIENTE',
  })

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'CREAR',
    tabla: 'etapas_proyecto',
    registroId: id,
    detalles: { proyecto_id: dto.proyecto_id, nombre: dto.nombre, orden },
    ip: ctx.ip,
  })

  return etapaRepository.findById(id)
}
