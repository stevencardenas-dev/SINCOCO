import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import EntradasInventario from './EntradasInventario.jsx'
import SalidasMateriales from './SalidasMateriales.jsx'
import DevolucionesMateriales from './DevolucionesMateriales.jsx'
import TrasladosMateriales from './TrasladosMateriales.jsx'

/**
 * Movimientos de inventario de materiales, en pestañas como Solicitudes y Herramientas.
 * Cada pestaña es la pantalla de su movimiento, con su propio formulario y su propio
 * permiso: solo aparece a quien puede consultarla.
 */
export const PESTANAS_MOVIMIENTOS = [
  { id: 'ingresos', label: 'Ingresos', permiso: 'entradas_inventario.listar', pagina: EntradasInventario },
  { id: 'salidas', label: 'Salidas', permiso: 'salidas_materiales.listar', pagina: SalidasMateriales },
  { id: 'devoluciones', label: 'Devoluciones', permiso: 'devoluciones_materiales.listar', pagina: DevolucionesMateriales },
  { id: 'traslados', label: 'Traslados', permiso: 'traslados_materiales.listar', pagina: TrasladosMateriales },
]

export default function Movimientos() {
  const { puede } = useAuth()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab'))
  const tabs = PESTANAS_MOVIMIENTOS.filter((t) => puede(t.permiso))
  const actual = tabs.find((t) => t.id === tab) ?? tabs[0]
  if (!actual) return null

  const pestanas = (
    <div className="flex flex-wrap gap-2 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={`-mb-px rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
            t.id === actual.id ? 'border-b-2 border-accent-400 text-brand-900' : 'text-slate-500 hover:text-brand-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )

  const Pagina = actual.pagina
  return <Pagina pestanas={pestanas} />
}
