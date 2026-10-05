import { useState } from 'react'

/** Un filtro cuenta como aplicado si tiene valor: '' / null / false no cuentan ('0' sí). */
const aplicado = (v) => v !== '' && v !== null && v !== undefined && v !== false

/**
 * Estado de los filtros de un listado.
 *
 * @param {object} vacios  Los filtros sin aplicar (a lo que vuelve «Limpiar filtros»).
 * @param {object} [opciones]
 * @param {object} [opciones.inicial]  Valores con los que arranca, si no son los vacíos
 *   (p. ej. una búsqueda que llega en la URL).
 * @param {() => void} [opciones.alCambiar]  Se llama en cada cambio o limpieza
 *   (p. ej. para volver a la primera página).
 */
export function useFiltros(vacios, { inicial = vacios, alCambiar } = {}) {
  const [filtros, setFiltros] = useState(inicial)

  /** Cambia un filtro: `cambiar('estado', valor)`. */
  const cambiar = (campo, valor) => {
    setFiltros((f) => ({ ...f, [campo]: valor }))
    alCambiar?.()
  }

  const limpiar = () => {
    setFiltros(vacios)
    alCambiar?.()
  }

  const activos = Object.values(filtros).filter(aplicado).length

  return { filtros, setFiltros, cambiar, limpiar, activos, hayFiltros: activos > 0 }
}
