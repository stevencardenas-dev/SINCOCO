import api from './api'

/**
 * Piezas comunes de los servicios por recurso.
 *
 * Los servicios devuelven directamente el cuerpo de la respuesta (`res.data`):
 * las páginas no conocen las rutas ni el formato de axios. Los errores siguen
 * siendo los de axios, así que `mensajeError` y `campoError` funcionan igual.
 */

/** Resuelve con el cuerpo de la respuesta. */
export const datos = (peticion) => peticion.then((res) => res.data)

/**
 * Quita los filtros vacíos ('', null, undefined, false) y envía las banderas
 * activas como 1: `{ incluirInactivos: true, buscar: '' }` → `{ incluirInactivos: 1 }`.
 */
export function sinVacios(params = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false)
      .map(([k, v]) => [k, v === true ? 1 : v]),
  )
}

/**
 * Operaciones estándar de un recurso REST del backend: listar con filtros,
 * registrar, actualizar y la baja lógica / reactivación (HU-18).
 */
export function recurso(ruta) {
  return {
    listar: (filtros) => datos(api.get(ruta, { params: sinVacios(filtros) })),
    crear: (cuerpo) => datos(api.post(ruta, cuerpo)),
    actualizar: (id, cuerpo) => datos(api.patch(`${ruta}/${id}`, cuerpo)),
    baja: (id) => datos(api.patch(`${ruta}/${id}/baja`)),
    reactivar: (id) => datos(api.patch(`${ruta}/${id}/reactivar`)),
  }
}
