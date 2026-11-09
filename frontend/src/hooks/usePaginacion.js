import { useEffect, useRef, useState } from 'react'

/**
 * Paginación en el cliente de un listado ya filtrado.
 * `clave` identifica los filtros aplicados: al cambiar vuelve a la primera página.
 * `paginaInicial` permite arrancar en otra página (p. ej. la que viene en la URL).
 */
export function usePaginacion(filas, { tamano = 10, clave = '', paginaInicial = 1 } = {}) {
  const [pagina, setPagina] = useState(paginaInicial)
  const previa = useRef(clave)
  useEffect(() => {
    // Solo cuando cambian los filtros se vuelve a la primera página (no al montar).
    if (previa.current !== clave) {
      previa.current = clave
      setPagina(1)
    }
  }, [clave])

  const total = filas.length
  const paginas = Math.max(1, Math.ceil(total / tamano))
  const actual = Math.min(pagina, paginas)
  const inicio = (actual - 1) * tamano
  return {
    pagina: actual,
    /** Página pedida sin recortar (no se pierde mientras el listado aún carga). */
    solicitada: pagina,
    paginas,
    total,
    setPagina,
    visibles: filas.slice(inicio, inicio + tamano),
    desde: total ? inicio + 1 : 0,
    hasta: Math.min(inicio + tamano, total),
  }
}
