import { useEffect, useState } from 'react'

/**
 * Paginación en el cliente de un listado ya filtrado.
 * `clave` identifica los filtros aplicados: al cambiar vuelve a la primera página.
 */
export function usePaginacion(filas, { tamano = 10, clave = '' } = {}) {
  const [pagina, setPagina] = useState(1)
  useEffect(() => { setPagina(1) }, [clave])

  const total = filas.length
  const paginas = Math.max(1, Math.ceil(total / tamano))
  const actual = Math.min(pagina, paginas)
  const inicio = (actual - 1) * tamano
  return {
    pagina: actual,
    paginas,
    total,
    setPagina,
    visibles: filas.slice(inicio, inicio + tamano),
    desde: total ? inicio + 1 : 0,
    hasta: Math.min(inicio + tamano, total),
  }
}
