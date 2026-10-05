import { registrar as bitacora } from '../db/bitacora.js'
import { darDeBaja, reactivar } from '../db/bajaLogica.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-18 · RN07: fábrica de la baja lógica y la reactivación de una entidad.
 *
 * Todas las entidades siguen el mismo guion: (verificar permisos) → buscar
 * (404) → marcar la fila (409 si no cambió nada) → bitácora → `{ id, activo }`.
 * Lo que cambia entre ellas se pasa como opciones:
 *
 * - `tabla`: tabla de `db/bajaLogica.js` (lista blanca).
 * - `mensajes`: `{ noEncontrado, yaDeBaja, noEstaDeBaja }` — textos de 404/409.
 * - `buscar(id)`: devuelve la entidad o null. Sin ella no hay 404 previo.
 * - `verificarPrevio(id, ctx)`: permisos que se comprueban antes de buscar.
 * - `verificar(entidad, ctx)`: permisos que dependen de la entidad ya cargada.
 * - `detallesBaja(entidad)`: detalles de la bitácora al dar de baja.
 * - `antesDeReactivar(entidad, id, ctx)`: reglas previas a reactivar.
 * - `despues(entidad, id, ctx)`: efectos tras el cambio (p. ej. renumerar).
 */
export function crearBajaReactivar({
  tabla,
  mensajes,
  buscar,
  verificarPrevio,
  verificar,
  detallesBaja,
  antesDeReactivar,
  despues,
}) {
  async function cargar(id, ctx) {
    if (verificarPrevio) await verificarPrevio(id, ctx)
    let entidad = null
    if (buscar) {
      entidad = await buscar(id)
      if (!entidad) throw new AppError(mensajes.noEncontrado, 404)
    }
    if (verificar) await verificar(entidad, ctx)
    return entidad
  }

  async function darDeBajaEntidad(id, ctx = {}) {
    const entidad = await cargar(id, ctx)
    const afectadas = await darDeBaja({ tabla, id, usuarioId: ctx.usuarioId })
    if (!afectadas) throw new AppError(mensajes.yaDeBaja, 409)
    if (despues) await despues(entidad, id, ctx)

    await bitacora({
      usuarioId: ctx.usuarioId,
      accion: 'DAR_DE_BAJA',
      tabla,
      registroId: Number(id),
      detalles: detallesBaja ? detallesBaja(entidad) : undefined,
      ip: ctx.ip,
    })
    return { id: Number(id), activo: 0 }
  }

  async function reactivarEntidad(id, ctx = {}) {
    const entidad = await cargar(id, ctx)
    if (antesDeReactivar) await antesDeReactivar(entidad, id, ctx)
    const afectadas = await reactivar({ tabla, id })
    if (!afectadas) throw new AppError(mensajes.noEstaDeBaja, 409)
    if (despues) await despues(entidad, id, ctx)

    await bitacora({
      usuarioId: ctx.usuarioId,
      accion: 'REACTIVAR',
      tabla,
      registroId: Number(id),
      ip: ctx.ip,
    })
    return { id: Number(id), activo: 1 }
  }

  return { darDeBaja: darDeBajaEntidad, reactivar: reactivarEntidad }
}
