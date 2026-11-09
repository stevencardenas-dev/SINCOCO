import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Estado de un listado (filtros, vista, orden, página, «dados de baja») guardado en la URL.
 *
 * Así el estado sobrevive a recargar y a entrar a un detalle y volver, y se puede compartir
 * un enlace con los filtros puestos. Solo se tocan los parámetros que se pasan: los demás
 * (`ficha`, `editar`…) quedan como estaban.
 */
const leer = () => new URLSearchParams(window.location.search)

/** Filtros con los valores de la URL (o los vacíos si no vienen). */
export function filtrosIniciales(vacios) {
  const p = leer()
  return Object.fromEntries(Object.entries(vacios).map(([k, v]) => [k, p.get(k) ?? v]))
}

/** «Incluir dados de baja» viene como ?baja=1. */
export const bajaInicial = () => leer().get('baja') === '1'

/** Valor de un parámetro si está entre los permitidos; si no, el de por defecto. */
export function valorUrl(nombre, permitidos, defecto) {
  const v = leer().get(nombre)
  return v !== null && permitidos.includes(v) ? v : defecto
}

export const paginaInicial = () => Math.max(1, Number(leer().get('pag')) || 1)

/** Dónde quedó el listado la última vez (para el «Volver» de un detalle). */
export const urlListado = (ruta) => {
  try {
    return `${ruta}${sessionStorage.getItem(`listado:${ruta}`) ?? ''}`
  } catch {
    return ruta
  }
}

/**
 * Escribe `valores` en la URL: vacío / false / null los quita, true se guarda como 1.
 * Reemplaza la entrada del historial (no llena el «Atrás» con cada tecla).
 */
export function useEscribirUrl(valores, ruta) {
  const [, setParams] = useSearchParams()
  const firma = JSON.stringify(valores)
  useEffect(() => {
    const nuevo = leer()
    for (const [k, v] of Object.entries(valores)) {
      if (v === '' || v === null || v === undefined || v === false) nuevo.delete(k)
      else nuevo.set(k, v === true ? '1' : String(v))
    }
    if (nuevo.toString() !== leer().toString()) setParams(nuevo, { replace: true })
    try {
      // Solo los parámetros del listado: las acciones puntuales (ficha, editar) no se recuerdan.
      const guardar = new URLSearchParams()
      for (const k of Object.keys(valores)) if (nuevo.has(k)) guardar.set(k, nuevo.get(k))
      const texto = guardar.toString()
      sessionStorage.setItem(`listado:${ruta}`, texto ? `?${texto}` : '')
    } catch { /* sin storage */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])
}
