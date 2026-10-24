import { useState } from 'react'
import SolicitudesHerramientas from './SolicitudesHerramientas.jsx'
import SolicitudesMateriales from './SolicitudesMateriales.jsx'

/**
 * Solicitudes al inventario, en pestañas como Gestión Administrativa:
 * Herramientas (HU-30) y Materiales (HU-08).
 */
const TABS = [
  { id: 'herramientas', label: 'Herramientas' },
  { id: 'materiales', label: 'Materiales' },
]

export default function Solicitudes() {
  const [tab, setTab] = useState('herramientas')

  const pestanas = (
    <div className="flex flex-wrap gap-2 border-b border-slate-200">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={`-mb-px rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
            t.id === tab ? 'border-b-2 border-accent-400 text-brand-900' : 'text-slate-500 hover:text-brand-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )

  if (tab === 'herramientas') return <SolicitudesHerramientas pestanas={pestanas} />

  return <SolicitudesMateriales pestanas={pestanas} />
}
