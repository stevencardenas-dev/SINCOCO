import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Proveedores from './Proveedores.jsx'
import ServiciosExternos from './ServiciosExternos.jsx'

/**
 * Proveedores (HU-13) y Servicios externos contratados (HU-28) en pestañas:
 * cada servicio depende de un proveedor activo, así que comparten módulo.
 */
const TABS = [
  { id: 'proveedores', label: 'Proveedores', permiso: 'proveedores.listar' },
  { id: 'servicios', label: 'Servicios externos', permiso: 'servicios_externos.listar' },
]

export default function ProveedoresServicios() {
  const { puede } = useAuth()
  const visibles = TABS.filter((t) => puede(t.permiso))
  const [tab, setTab] = useState(visibles[0]?.id)

  const pestanas = (
    <div className="flex flex-wrap gap-2 border-b border-slate-200">
      {visibles.map((t) => (
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

  return tab === 'servicios' ? <ServiciosExternos pestanas={pestanas} /> : <Proveedores pestanas={pestanas} />
}
