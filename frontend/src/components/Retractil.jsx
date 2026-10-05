import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

/**
 * Bloque plegable dentro de una tarjeta.
 *
 * Cerrado muestra solo el título (y una insignia opcional, como el número de
 * filtros aplicados); al presionarlo se despliega el contenido. Sirve para
 * esconder formularios y filtros que no se usan todo el tiempo y dejar la lista
 * a la vista.
 */
export default function Retractil({
  titulo,
  icono: Icono,
  insignia = null,
  abiertoInicial = false,
  children,
}) {
  const [abierto, setAbierto] = useState(abiertoInicial)

  return (
    <div className="border-b border-slate-100">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 px-5 py-3.5 text-left text-slate-900 hover:bg-slate-50"
      >
        {Icono && <Icono className="h-5 w-5 text-brand-600" />}
        <span className="text-sm font-semibold">{titulo}</span>
        {insignia && (
          <span className="badge bg-accent-100 text-brand-800 ring-1 ring-accent-300">{insignia}</span>
        )}
        <ChevronDownIcon
          className={`ml-auto h-5 w-5 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {abierto && <div className="border-t border-slate-100 bg-slate-50/60 p-5">{children}</div>}
    </div>
  )
}
