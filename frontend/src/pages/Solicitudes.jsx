import { useState } from 'react'
import { CubeIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import SolicitudesHerramientas from './SolicitudesHerramientas.jsx'

/**
 * Solicitudes al inventario, en pestañas como Gestión Administrativa:
 * Herramientas (HU-30) y Materiales (HU-08, aún solo visual).
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

  return (
    <div className="space-y-6">
      <PageHeader title="Solicitudes" subtitle="Solicitudes de materiales al inventario" />
      {pestanas}
      <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
        <CubeIcon className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">Solicitud de materiales</p>
        <p className="max-w-md text-sm text-slate-500">
          Próximamente: el maestro de obra podrá pedir materiales al inventario y bodega los aprobará.
        </p>
      </div>
    </div>
  )
}
