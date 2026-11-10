import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Proveedores from './Proveedores.jsx'
import ServiciosExternos from './ServiciosExternos.jsx'
import Pestanas from '../components/Pestanas.jsx'
import { BriefcaseIcon, TruckIcon } from '@heroicons/react/24/outline'

/**
 * Proveedores (HU-13) y Servicios externos contratados (HU-28) en pestañas:
 * cada servicio depende de un proveedor activo, así que comparten módulo.
 */
const ICONOS_TAB = { proveedores: TruckIcon, servicios: BriefcaseIcon }

const TABS = [
  { id: 'proveedores', label: 'Proveedores', permiso: 'proveedores.listar' },
  { id: 'servicios', label: 'Servicios externos', permiso: 'servicios_externos.listar' },
]

export default function ProveedoresServicios() {
  const { puede } = useAuth()
  const visibles = TABS.filter((t) => puede(t.permiso))
  const [tab, setTab] = useState(visibles[0]?.id)

  const pestanas = (
    <Pestanas tabs={visibles.map((t) => ({ id: t.id, label: t.label, icono: ICONOS_TAB[t.id] }))} activo={tab} onCambiar={setTab} />
  )

  return tab === 'servicios' ? <ServiciosExternos pestanas={pestanas} /> : <Proveedores pestanas={pestanas} />
}
