import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import EntradasInventario from './EntradasInventario.jsx'
import SalidasMateriales from './SalidasMateriales.jsx'
import DevolucionesMateriales from './DevolucionesMateriales.jsx'
import TrasladosMateriales from './TrasladosMateriales.jsx'
import Pestanas from '../components/Pestanas.jsx'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowUturnLeftIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'

/**
 * Movimientos de inventario de materiales, en pestañas como Solicitudes y Herramientas.
 * Cada pestaña es la pantalla de su movimiento, con su propio formulario y su propio
 * permiso: solo aparece a quien puede consultarla.
 */
const ICONOS_TAB = { ingresos: ArrowDownTrayIcon, salidas: ArrowUpTrayIcon, devoluciones: ArrowUturnLeftIcon, traslados: ArrowsRightLeftIcon }

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
    <Pestanas tabs={tabs.map((t) => ({ id: t.id, label: t.label, icono: ICONOS_TAB[t.id] }))} activo={actual.id} onCambiar={setTab} />
  )

  const Pagina = actual.pagina
  return <Pagina pestanas={pestanas} />
}
