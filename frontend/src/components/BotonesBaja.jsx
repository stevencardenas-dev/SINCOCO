import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'

/**
 * Botones universales de retiro, con una sola forma y color en todo el sistema.
 *
 *  - `BotonDarDeBaja`: el registro pasa a «dado de baja» (se conserva el
 *    historial). Rojo, con papelera; va al pie del formulario de edición.
 *  - `BotonQuitar`: saca un elemento de una lista dentro del formulario
 *    (criterio, línea de material, etc.). Pequeño, con una X, en rojo suave.
 */
export function BotonDarDeBaja({ onClick, children = 'Dar de baja', className = 'ml-auto', disabled = false }) {
  return (
    <button type="button" className={`btn-peligro ${className}`} onClick={onClick} disabled={disabled}>
      <TrashIcon className="h-4 w-4" aria-hidden="true" /> {children}
    </button>
  )
}

export function BotonQuitar({ onClick, etiqueta = 'Quitar', disabled = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <XMarkIcon className="h-4 w-4" />
    </button>
  )
}
