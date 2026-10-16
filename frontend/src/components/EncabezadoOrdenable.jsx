import { ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'

/** Encabezado de columna ordenable (ver lib/ordenarTabla.js). */
export default function EncabezadoOrdenable({ titulo, orden, onOrden, className = '' }) {
  const activa = orden?.titulo === titulo
  return (
    <th
      className={className}
      aria-sort={activa ? (orden.desc ? 'descending' : 'ascending') : undefined}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-brand-800"
        onClick={() => onOrden(titulo)}
        aria-label={`Ordenar por ${titulo}`}
      >
        {titulo}
        {!activa ? (
          <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-40" />
        ) : orden.desc ? (
          <ChevronDownIcon className="h-3.5 w-3.5 text-brand-700" />
        ) : (
          <ChevronUpIcon className="h-3.5 w-3.5 text-brand-700" />
        )}
      </button>
    </th>
  )
}
