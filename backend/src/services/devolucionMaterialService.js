import * as repo from '../repositories/devolucionMaterialRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'
import { textoOpcional, revisarLargo } from '../utils/campos.js'

/**
 * HU-09: devolución de materiales sobrantes.
 * Una devolución apta suma la cantidad a la existencia (trigger trg_devolucion_suma_existencia) y ajusta el
 * costo de la actividad de origen; una no apta se registra con su motivo sin sumarse a la existencia.
 */

const entero = (v, campo) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`${campo} es obligatorio`, 400, campo)
  return n
}
const positivo = (v, campo) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) throw new AppError(`${campo} debe ser mayor que cero`, 400, campo)
  if (Math.round(n * 100) / 100 !== n) throw new AppError(`${campo} admite como máximo 2 decimales`, 400, campo)
  return n
}
/** `apto` llega como booleano o texto; si no se indica, el material se considera apto. */
const esApto = (v) => !(v === false || v === 0 || ['false', '0', 'no'].includes(String(v).trim().toLowerCase()))

export const listarDevoluciones = () => repo.listar()
export const opcionesDevolucion = () => repo.opciones()
export const actividadesParaDevolucion = (proyectoId) => repo.actividadesDeProyecto(entero(proyectoId, 'proyecto_id'))
export const salidasParaDevolucion = (proyectoId) => repo.salidasDeProyecto(entero(proyectoId, 'proyecto_id'))

export async function obtenerDevolucion(id) {
  const d = await repo.findById(id)
  if (!d) throw new AppError('Devolución no encontrada', 404)
  return d
}

export async function registrarDevolucion(body = {}, ctx) {
  const almacenId = entero(body.almacen_id, 'almacen_id')
  const proyectoId = entero(body.proyecto_id, 'proyecto_id')
  const actividadId = entero(body.actividad_id, 'actividad_id')
  const materialId = entero(body.material_id, 'material_id')
  const trabajadorId = entero(body.devuelto_por_trabajador_id, 'devuelto_por_trabajador_id')
  const cantidad = positivo(body.cantidad, 'cantidad')
  const apto = esApto(body.apto)
  const salidaId = body.salida_origen_id ? entero(body.salida_origen_id, 'salida_origen_id') : null
  // El motivo es obligatorio; cuando el material no es apto, además explica por qué no reingresa.
  const motivo = textoOpcional(body.motivo)
  if (!motivo) throw new AppError('El motivo de la devolución es obligatorio', 400, 'motivo')
  revisarLargo(motivo, 500, 'motivo')

  const id = await repo.registrar({
    almacenId, proyectoId, actividadId, materialId, trabajadorId, usuarioId: ctx.usuarioId, cantidad, apto, motivo, salidaId,
    validar: ({ almacen, proyecto, actividad, material, trabajador, salida, despachado, devuelto, costoSalida }) => {
      if (!almacen || !almacen.activo) throw new AppError('El almacén de destino no existe o está dado de baja', 404, 'almacen_id')
      if (!proyecto || !proyecto.activo) throw new AppError('El proyecto no existe o está dado de baja', 404, 'proyecto_id')
      if (!actividad || !actividad.activo || Number(actividad.proyecto_id) !== proyectoId) {
        throw new AppError('La actividad no existe o no pertenece al proyecto', 400, 'actividad_id')
      }
      if (!material || !material.activo) throw new AppError('El material no existe o está dado de baja', 404, 'material_id')
      if (!trabajador || !trabajador.activo) throw new AppError('El trabajador que devuelve no existe o está dado de baja', 404, 'devuelto_por_trabajador_id')
      if (salidaId) {
        if (!salida) throw new AppError('La salida de origen no existe', 404, 'salida_origen_id')
        if (Number(salida.proyecto_id) !== proyectoId) throw new AppError('La salida de origen no es del proyecto indicado', 400, 'salida_origen_id')
        if (salida.actividad_id && Number(salida.actividad_id) !== actividadId) {
          throw new AppError('La salida de origen no es de la actividad indicada', 400, 'salida_origen_id')
        }
        if (despachado <= 0) throw new AppError('La salida de origen no incluye ese material', 400, 'material_id')
        const pendiente = Math.round((despachado - devuelto) * 100) / 100
        if (cantidad > pendiente) {
          throw new AppError(`La cantidad supera lo que queda por devolver de esa salida (${pendiente})`, 409, 'cantidad')
        }
      }
      // Costo al que se ajusta la actividad: el de la salida que originó la devolución o, sin ella, el de referencia.
      return Number(costoSalida ?? material.costo_referencia ?? 0)
    },
  })
  const devolucion = await repo.findById(id)
  await bitacora({
    usuarioId: ctx.usuarioId, accion: 'REGISTRAR_DEVOLUCION_MATERIALES', tabla: 'devoluciones_materiales', registroId: id,
    detalles: {
      comprobante: devolucion.comprobante, material_id: materialId, cantidad, apto, proyecto_id: proyectoId,
      actividad_id: actividadId, salida_origen_id: salidaId, ajuste_costo: devolucion.ajuste_costo,
    },
    ip: ctx.ip,
  })
  return devolucion
}
