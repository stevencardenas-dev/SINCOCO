import * as dashboardRepository from '../repositories/dashboardRepository.js'

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
