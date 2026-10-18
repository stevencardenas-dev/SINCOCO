import * as asignacionRepository from '../repositories/asignacionRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { aFechaDia } from '../utils/fechas.js'

/**
 * CU-05 · Alt 2: cuando se alcanza la fecha fin programada de una asignación sin
 * que se haya registrado una extensión (HU-31 mueve esa fecha) ni la fecha fin
 * real, la asignación se cierra: queda FINALIZADA con su fecha fin programada
 * como fecha fin real. La disponibilidad del trabajador se calcula con las
 * asignaciones vigentes, así que vuelve a quedar libre sin más cambios.
 *
 * Devuelve cuántas asignaciones se cerraron.
 */
export async function cerrarAsignacionesVencidas() {
  const vencidas = await asignacionRepository.vencidasActivas()
  let cerradas = 0
  for (const a of vencidas) {
    if (!(await asignacionRepository.finalizarVencida(a.id))) continue
    cerradas += 1
    await bitacora({
      usuarioId: null, // lo hace el sistema
      accion: 'CIERRE_AUTOMATICO',
      tabla: 'asignaciones_personal',
      registroId: Number(a.id),
      detalles: {
        trabajador_id: a.trabajador_id,
        proyecto_id: a.proyecto_id,
        actividad_id: a.actividad_id,
        fecha_fin_real: aFechaDia(a.fecha_fin_programada),
      },
    })
  }
  return cerradas
}

const CADA_HORA = 60 * 60 * 1000

/** Evalúa la vigencia al arrancar y cada hora; un fallo se registra y no tumba el servidor. */
export function programarCierreAutomatico() {
  const evaluar = () =>
    cerrarAsignacionesVencidas()
      .then((n) => { if (n > 0) console.log(`Asignaciones cerradas por fecha fin: ${n}`) })
      .catch((err) => console.error('cierre automático de asignaciones:', err.message))
  evaluar()
  return setInterval(evaluar, CADA_HORA).unref()
}
