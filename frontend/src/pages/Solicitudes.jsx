import { useState } from 'react'
import SolicitudesHerramientas from './SolicitudesHerramientas.jsx'
import SolicitudesMateriales from './SolicitudesMateriales.jsx'
import Pestanas from '../components/Pestanas.jsx'
import { CubeIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

/**
 * Solicitudes al inventario, en pestañas como Gestión Administrativa:
 * Herramientas (HU-30) y Materiales (HU-08).
 */
const ICONOS_TAB = { herramientas: WrenchScrewdriverIcon, materiales: CubeIcon }

const TABS = [
  { id: 'herramientas', label: 'Herramientas' },
  { id: 'materiales', label: 'Materiales' },
]

export default function Solicitudes() {
  const [tab, setTab] = useState('herramientas')

  const pestanas = (
    <Pestanas tabs={TABS.map((t) => ({ ...t, icono: ICONOS_TAB[t.id] }))} activo={tab} onCambiar={setTab} />
  )

  if (tab === 'herramientas') return <SolicitudesHerramientas pestanas={pestanas} />

  return <SolicitudesMateriales pestanas={pestanas} />
}
