import * as dashboardRepository from '../repositories/dashboardRepository.js'
import { alcanceDeUsuario } from './accesoService.js'
import { AppError } from '../utils/AppError.js'

/**
 * Indicadores del panel de inicio (RF04 · RF25 · RF26 · RF31).
 *
 * Todo lo que devuelve esta consulta sale de las tablas del sistema: no hay
 * series ni totales de demostración. Si una tabla está vacía, el indicador vale
 * cero y la pantalla debe decirlo, no rellenarlo con datos inventados.
 *
 * Aún no existen los módulos de inventario, costos e incidencias (HU-07 a
 * HU-30), así que esas tablas están vacías y sus indicadores salen en cero;
 * la fórmula del costo es la de HU-15 (materiales despachados + servicios
 * externos + órdenes de compra) y funciona en cuanto haya movimientos.
 */

// MySQL devuelve los DECIMAL como texto; el frontend necesita números.
const num = (valor) => Number(valor ?? 0)

export async function obtenerResumen() {
  const proyectos = await dashboardRepository.totalesProyectos()
  const porEstado = await dashboardRepository.proyectosPorEstado()
  const avance = await dashboardRepository.avanceProyectos()
  const inventario = await dashboardRepository.totalesInventario()
  const bajoStock = await dashboardRepository.materialesBajoStock()
  const alertas = await dashboardRepository.alertasPendientes()
  const personal = await dashboardRepository.totalesPersonal()
  const porCargo = await dashboardRepository.personalPorCargo()
  const cuentas = await dashboardRepository.cuentasActivas()
  const costos = await dashboardRepository.totalesCostos()
  const incidencias = await dashboardRepository.totalesIncidencias()
  const ultimasIncidencias = await dashboardRepository.ultimasIncidenciasAbiertas()

  return {
    generado_en: new Date().toISOString(),
    proyectos: {
      total: num(proyectos.total),
      activos: num(proyectos.activos),
      inactivos: num(proyectos.inactivos),
      presupuesto_activos: num(proyectos.presupuesto_activos),
      por_estado: porEstado.map((e) => ({ estado: e.estado, total: num(e.total) })),
      avance: avance.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        estado: p.estado,
        avance: num(p.porcentaje_avance_total),
      })),
    },
    inventario: {
      materiales: num(inventario.materiales),
      bajo_stock: num(inventario.bajo_stock),
      alertas_pendientes: num(alertas.pendientes),
      detalle: bajoStock.map((m) => ({
        id: m.id,
        codigo: m.codigo,
        descripcion: m.descripcion,
        unidad_medida: m.unidad_medida,
        existencia_total: num(m.existencia_total),
        nivel_minimo: num(m.nivel_minimo),
      })),
    },
    personal: {
      total: num(personal.total),
      activos: num(personal.activos),
      con_cuenta: num(cuentas.activos),
      por_cargo: porCargo.map((c) => ({ cargo: c.cargo, total: num(c.total) })),
    },
    costos: {
      materiales_despachados: num(costos.materiales_despachados),
      servicios_externos: num(costos.servicios_externos),
      ordenes_compra: num(costos.ordenes_compra),
      total:
        num(costos.materiales_despachados) +
        num(costos.servicios_externos) +
        num(costos.ordenes_compra),
    },
    incidencias: {
      total: num(incidencias.total),
      abiertas: num(incidencias.abiertas),
      ultimas: ultimasIncidencias,
    },
  }
}

/**
 * HU-16 · dashboard de indicadores gerenciales.
 *
 * Devuelve el avance total (ponderado por presupuesto), el estado de cada
 * proyecto con su último costo consolidado y las alertas pendientes que puede
 * ver quien consulta. Los filtros son por proyecto, estado y rango de fechas
 * de programación.
 *
 * Un proyecto sin consolidación de costos no rompe el resto: se devuelve con
 * `sin_datos: true` y se anota en `advertencias` (escenario alternativo de la
 * HU).
 */
export const ESTADOS_INDICADOR = ['PLANIFICACION', 'EN_EJECUCION', 'PAUSADO', 'FINALIZADO', 'CANCELADO']

const esFecha = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? ''))

/**
 * Avance total del conjunto de proyectos: se pondera por presupuesto para que
 * un proyecto grande no pese lo mismo que uno pequeño. Si ninguno tiene
 * presupuesto, se usa el promedio simple; sin proyectos no hay indicador.
 */
export function avanceTotal(proyectos) {
  if (proyectos.length === 0) return null
  // Acepta la fila de la base (`porcentaje_avance_total`) y el proyecto ya
  // normalizado por el servicio (`avance`).
  const avanceDe = (p) => num(p.porcentaje_avance_total ?? p.avance)
  const conPresupuesto = proyectos.filter((p) => num(p.presupuesto_inicial) > 0)
  if (conPresupuesto.length === 0) {
    const suma = proyectos.reduce((t, p) => t + avanceDe(p), 0)
    return Number((suma / proyectos.length).toFixed(2))
  }
  const presupuesto = conPresupuesto.reduce((t, p) => t + num(p.presupuesto_inicial), 0)
  const ponderado = conPresupuesto.reduce(
    (t, p) => t + avanceDe(p) * num(p.presupuesto_inicial),
    0,
  )
  return Number((ponderado / presupuesto).toFixed(2))
}

function validarFiltros(filtros = {}) {
  const estado = String(filtros.estado ?? '').trim().toUpperCase()
  if (estado && !ESTADOS_INDICADOR.includes(estado)) {
    throw new AppError(`estado debe ser uno de: ${ESTADOS_INDICADOR.join(', ')}`, 400, 'estado')
  }

  let proyectoId = null
  if (filtros.proyecto_id !== undefined && filtros.proyecto_id !== null && filtros.proyecto_id !== '') {
    proyectoId = Number(filtros.proyecto_id)
    if (!Number.isInteger(proyectoId) || proyectoId <= 0) {
      throw new AppError('proyecto_id debe ser un identificador válido', 400, 'proyecto_id')
    }
  }

  const desde = filtros.desde ? String(filtros.desde) : null
  const hasta = filtros.hasta ? String(filtros.hasta) : null
  for (const [campo, valor] of [['desde', desde], ['hasta', hasta]]) {
    if (valor !== null && !esFecha(valor)) throw new AppError(`${campo} debe ser una fecha AAAA-MM-DD`, 400, campo)
  }
  if (desde && hasta && desde > hasta) {
    throw new AppError('El rango de fechas está invertido: desde es posterior a hasta', 400, 'desde')
  }

  return { proyectoId, estado, desde, hasta }
}

export async function obtenerIndicadores(filtros = {}, usuario = null) {
  const { proyectoId, estado, desde, hasta } = validarFiltros(filtros)
  const alcance = await alcanceDeUsuario(usuario)

  const filas = await dashboardRepository.indicadoresProyectos({
    proyectoId, estado, desde, hasta, alcance,
  })
  const proyectos = filas.map((p) => ({
    id: Number(p.id),
    codigo: p.codigo,
    nombre: p.nombre,
    estado: p.estado,
    fecha_inicio_programada: p.fecha_inicio_programada,
    fecha_fin_programada: p.fecha_fin_programada,
    avance: num(p.porcentaje_avance_total),
    presupuesto_inicial: num(p.presupuesto_inicial),
    costo_real: p.costo_real === null || p.costo_real === undefined ? null : num(p.costo_real),
    desviacion_porcentaje:
      p.desviacion_porcentaje === null || p.desviacion_porcentaje === undefined
        ? null
        : num(p.desviacion_porcentaje),
    consolidado_en: p.consolidado_en ?? null,
    sin_datos: p.consolidado_en === null || p.consolidado_en === undefined,
  }))

  // Alertas: las pendientes de los proyectos que el usuario puede ver. Las de
  // inventario no cuelgan de un proyecto, así que solo se muestran a quien ve
  // todos los proyectos (gerente y administrador).
  const idsVisibles = new Set(proyectos.map((p) => p.id))
  const alertas = (await dashboardRepository.alertasSinAtender()).filter((a) => {
    if (proyectoId) return Number(a.proyecto_id) === proyectoId
    if (alcance.total) return true
    return a.proyecto_id !== null && idsVisibles.has(Number(a.proyecto_id))
  })

  const porTipo = new Map()
  for (const a of alertas) porTipo.set(a.tipo, (porTipo.get(a.tipo) ?? 0) + 1)

  return {
    generado_en: new Date().toISOString(),
    filtros: { proyecto_id: proyectoId, estado: estado || null, desde, hasta },
    avance_total: avanceTotal(proyectos),
    proyectos,
    alertas: {
      total: alertas.length,
      por_tipo: [...porTipo].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total),
      activas: alertas.slice(0, 8).map((a) => ({
        id: Number(a.id),
        tipo: a.tipo,
        titulo: a.titulo,
        descripcion: a.descripcion,
        proyecto_id: a.proyecto_id === null ? null : Number(a.proyecto_id),
        creada_en: a.creada_en,
      })),
    },
    advertencias: proyectos
      .filter((p) => p.sin_datos)
      .map((p) => `${p.codigo} no tiene costos consolidados: su indicador de costo se muestra vacío.`),
  }
}
