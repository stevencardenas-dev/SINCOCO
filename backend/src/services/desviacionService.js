import * as consolidacionRepository from '../repositories/consolidacionCostoRepository.js'
import { alcanceDeUsuario } from './accesoService.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-39 · desviación presupuestal en tiempo real.
 *
 * Complementa el dashboard (HU-16) y depende de la consolidación de costos
 * (HU-15): la desviación se calcula con el último corte guardado, como
 * (costo real − presupuesto inicial) / presupuesto inicial × 100.
 *
 * El desglose separa las tres fuentes del costo real (materiales, servicios
 * externos y órdenes de compra) y un semáforo con umbrales configurables marca
 * la gravedad. Un proyecto sin consolidar no rompe la lista: se devuelve vacío
 * con su advertencia.
 */

export const ESTADOS_PROYECTO = ['PLANIFICACION', 'EN_EJECUCION', 'PAUSADO', 'FINALIZADO', 'CANCELADO']

export const UMBRALES_POR_DEFECTO = { advertencia: 5, critico: 15 }

const num = (valor) => Number(valor ?? 0)
const redondear = (valor) => Number(valor.toFixed(2))

/**
 * Semáforo de la desviación: `SIN_DATOS` cuando no hay corte; `CRITICA` al
 * superar el umbral crítico; `ADVERTENCIA` al superar el de advertencia;
 * `NORMAL` en el resto (incluida una desviación negativa: ir bajo presupuesto
 * no es un riesgo).
 */
export function semaforo(desviacion, umbrales = UMBRALES_POR_DEFECTO) {
  if (desviacion === null || desviacion === undefined) return 'SIN_DATOS'
  if (desviacion > umbrales.critico) return 'CRITICA'
  if (desviacion > umbrales.advertencia) return 'ADVERTENCIA'
  return 'NORMAL'
}

/** Valida los filtros y los umbrales; los umbrales son configurables por consulta. */
export function validarFiltros(filtros = {}) {
  const estado = String(filtros.estado ?? '').trim().toUpperCase()
  if (estado && !ESTADOS_PROYECTO.includes(estado)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS_PROYECTO.join(', ')}`, 400, 'estado')
  }

  let proyectoId = null
  if (filtros.proyecto_id !== undefined && filtros.proyecto_id !== null && filtros.proyecto_id !== '') {
    proyectoId = Number(filtros.proyecto_id)
    if (!Number.isInteger(proyectoId) || proyectoId <= 0) {
      throw new AppError('proyecto_id debe ser un identificador válido', 400, 'proyecto_id')
    }
  }

  const leerUmbral = (valor, campo, porDefecto) => {
    if (valor === undefined || valor === null || valor === '') return porDefecto
    const n = Number(valor)
    if (!Number.isFinite(n) || n < 0) {
      throw new AppError(`${campo} debe ser un porcentaje mayor o igual que 0`, 400, campo)
    }
    return n
  }
  const advertencia = leerUmbral(filtros.umbral_advertencia, 'umbral_advertencia', UMBRALES_POR_DEFECTO.advertencia)
  const critico = leerUmbral(filtros.umbral_critico, 'umbral_critico', UMBRALES_POR_DEFECTO.critico)
  if (critico <= advertencia) {
    throw new AppError('El umbral crítico debe ser mayor que el de advertencia', 400, 'umbral_critico')
  }

  return { proyectoId, estado, umbrales: { advertencia, critico } }
}

export async function listarDesviaciones(filtros = {}, usuario = null) {
  const { proyectoId, estado, umbrales } = validarFiltros(filtros)
  const alcance = await alcanceDeUsuario(usuario)
  const filas = await consolidacionRepository.resumenPorProyecto({ estado, proyectoId, alcance })

  const proyectos = filas.map((p) => {
    const conDatos = p.consolidado_en !== null && p.consolidado_en !== undefined
    const desviacion = p.desviacion_porcentaje === null || p.desviacion_porcentaje === undefined
      ? null
      : num(p.desviacion_porcentaje)
    return {
      id: Number(p.id),
      codigo: p.codigo,
      nombre: p.nombre,
      estado: p.estado,
      presupuesto_inicial: num(p.presupuesto_inicial),
      desglose: {
        materiales: conDatos ? num(p.costo_materiales) : null,
        servicios_externos: conDatos ? num(p.costo_servicios) : null,
        ordenes_compra: conDatos ? num(p.costo_ordenes_compra) : null,
      },
      costo_real: conDatos ? num(p.costo_real) : null,
      desviacion_porcentaje: desviacion,
      semaforo: conDatos ? semaforo(desviacion, umbrales) : 'SIN_DATOS',
      consolidado_en: p.consolidado_en ?? null,
      sin_datos: !conDatos,
      advertencia: conDatos
        ? null
        : 'El proyecto no tiene costos consolidados: ejecute la consolidación (HU-15) para ver su desviación.',
    }
  })

  const conDatos = proyectos.filter((p) => !p.sin_datos)
  const desviaciones = conDatos.map((p) => p.desviacion_porcentaje).filter((d) => d !== null)
  const ultima = conDatos
    .map((p) => p.consolidado_en)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  return {
    generado_en: new Date().toISOString(),
    filtros: { proyecto_id: proyectoId, estado: estado || null },
    umbrales,
    resumen: {
      proyectos: proyectos.length,
      con_datos: conDatos.length,
      sin_datos: proyectos.filter((p) => p.sin_datos).length,
      criticos: proyectos.filter((p) => p.semaforo === 'CRITICA').length,
      advertencia: proyectos.filter((p) => p.semaforo === 'ADVERTENCIA').length,
      desviacion_promedio:
        desviaciones.length === 0 ? null : redondear(desviaciones.reduce((t, d) => t + d, 0) / desviaciones.length),
    },
    ultima_consolidacion: ultima,
    proyectos,
    advertencias: proyectos.filter((p) => p.sin_datos).map((p) => `${p.codigo}: ${p.advertencia}`),
  }
}
