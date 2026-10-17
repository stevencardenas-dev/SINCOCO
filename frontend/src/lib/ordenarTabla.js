const vacio = (v) => v === null || v === undefined || v === false || v === ''

/** Compara dos claves de orden: vacíos al final, números como números, texto con acentos y dígitos. */
export function comparar(a, b) {
  const aVacio = vacio(a)
  const bVacio = vacio(b)
  if (aVacio || bVacio) return aVacio === bVacio ? 0 : aVacio ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
}

/** Ciclo del encabezado: ascendente → descendente → sin orden. `orden` = { titulo, desc } | null. */
export const alternarOrden = (orden, titulo) =>
  orden?.titulo !== titulo ? { titulo, desc: false } : orden.desc ? null : { titulo, desc: true }

/** Ordena `filas` según `orden`; `claves[titulo](fila)` da el valor de cada columna. */
export function ordenarFilas(filas, orden, claves) {
  const clave = orden && claves[orden.titulo]
  if (!clave) return filas
  const signo = orden.desc ? -1 : 1
  return [...filas].sort((x, y) => signo * comparar(clave(x), clave(y)))
}
