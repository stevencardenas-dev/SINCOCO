/**
 * Categorías de los catálogos del personal (HU-04). Agrupan los selectores de
 * cargo y especialidad con <optgroup>. La misma lista la valida el backend en
 * backend/src/services/catalogoService.js: si se cambia aquí, cambiarla allá.
 */
export const CATEGORIAS = {
  cargos: ['Directivo / Técnico', 'Administrativo', 'Operativo / Obra'],
  especialidades: [
    'Obra Negra y Gris (Estructura)',
    'Instalaciones (MEP)',
    'Acabados y Detalles',
    'Trabajos Especializados',
    'Seguridad y Logística',
  ],
}

/** Grupo de los valores sin categoría (p. ej. cargos migrados del texto libre). */
export const SIN_CATEGORIA = 'Otros'

/**
 * Agrupa las filas de un catálogo en el orden de sus categorías, ordenadas por
 * nombre dentro de cada grupo. Los grupos vacíos no se devuelven y lo que no
 * tiene una categoría conocida va al final, en «Otros».
 */
export function agruparPorCategoria(filas, tipo) {
  const orden = CATEGORIAS[tipo] ?? []
  const grupos = new Map([...orden, SIN_CATEGORIA].map((c) => [c, []]))
  for (const fila of filas) {
    const clave = orden.includes(fila.categoria) ? fila.categoria : SIN_CATEGORIA
    grupos.get(clave).push(fila)
  }
  return [...grupos]
    .filter(([, items]) => items.length > 0)
    .map(([categoria, items]) => ({
      categoria,
      items: [...items].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    }))
}
