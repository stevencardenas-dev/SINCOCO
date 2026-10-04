import { useState } from 'react'
import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline'

/**
 * Panel de búsqueda y filtros plegable.
 *
 * Cerrado muestra solo el título (y cuántos filtros hay aplicados); al
 * presionarlo se despliegan las opciones. Así la tabla queda a la vista sin
 * tener que bajar, sobre todo en el celular.
 */
export default function FiltrosDesplegable({
  titulo,
  activos = 0,
  abiertoInicial = false,
  ariaLabel,
  children,
}) {
  const [abierto, setAbierto] = useState(abiertoInicial)

  return (
    <form className="card" onSubmit={(e) => e.preventDefault()} aria-label={ariaLabel ?? titulo}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 px-5 py-4 text-left text-slate-900"
      >
        <FunnelIcon className="h-5 w-5 text-brand-600" />
        <span className="text-base font-semibold">{titulo}</span>
        {activos > 0 && (
          <span className="badge bg-accent-100 text-brand-800 ring-1 ring-accent-300">
            {activos} {activos === 1 ? 'filtro' : 'filtros'}
          </span>
        )}
        <ChevronDownIcon
          className={`ml-auto h-5 w-5 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {abierto && <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">{children}</div>}
    </form>
  )
}
