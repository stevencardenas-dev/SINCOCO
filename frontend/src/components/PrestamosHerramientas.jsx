import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'
import TablaSolicitudes from './TablaSolicitudes.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import BotonActualizar from './BotonActualizar.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import PageHeader from './PageHeader.jsx'
import { TablaFicha } from './Ficha.jsx'
import { prestamosHerramientasApi } from '../services/prestamosHerramientas'
import { solicitudesHerramientasApi } from '../services/solicitudesHerramientas'
import { useRecurso } from '../hooks/useRecurso'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-11 (solo lectura): panel de préstamos para bodega (pestaña de Herramientas).
 * Muestra primero las solicitudes de los maestros de obra que esperan entrega
 * (pendientes y aprobadas) y debajo los préstamos registrados.
 */
const ESTADOS_PRESTAMO = {
  ACTIVO: 'bg-sky-50 text-sky-700 ring-sky-200',
  DEVUELTO: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ATRASADO: 'bg-red-50 text-red-700 ring-red-200',
  CON_NOVEDAD: 'bg-amber-50 text-amber-700 ring-amber-200',
}
const insignia = (mapa, valor) => (
  <span className={`badge ring-1 ${mapa[valor] ?? 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{valor}</span>
)

const Cargando = () => (
  <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
    <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
  </p>
)

export default function PrestamosHerramientas({ pestanas }) {
  const { puede } = useAuth()
  const puedeResolver = puede('solicitudes_herramientas.resolver')
  const [porRechazar, setPorRechazar] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [errorRechazo, setErrorRechazo] = useState('')
  const sol = useRecurso(() => solicitudesHerramientasApi.listar(), [], { mensaje: 'No se pudieron cargar las solicitudes.' })
  const pre = useRecurso(() => prestamosHerramientasApi.listar(), [], { mensaje: 'No se pudieron cargar los préstamos.' })

  const porEntregar = (sol.datos ?? []).filter((s) => s.estado === 'PENDIENTE' || s.estado === 'APROBADA')
  const recargar = () => Promise.all([sol.recargar(), pre.recargar()])

  const accion = (fn, s, exito) =>
    sol.ejecutar(() => fn(s.id), { exito: `${exito} ${s.codigo}.`, error: 'No se pudo completar la acción.' }).then(() => pre.recargar())

  const rechazar = async () => {
    if (!motivo.trim()) return setErrorRechazo('Debe indicar la observación que justifica el rechazo.')
    const s = porRechazar
    setPorRechazar(null)
    await sol.ejecutar(() => solicitudesHerramientasApi.rechazar(s.id, motivo.trim()), {
      exito: `Solicitud ${s.codigo} rechazada.`, error: 'No se pudo rechazar la solicitud.',
    })
  }

  // Aprobar, rechazar y atender son de bodega: el maestro solo solicita y cancela.
  const acciones = (s) => {
    if (!puedeResolver) return null
    if (s.estado === 'PENDIENTE') {
      return (
        <>
          <button type="button" className="btn-primary text-xs" onClick={() => accion(solicitudesHerramientasApi.aprobar, s, 'Aprobada')}>Aprobar</button>
          <button type="button" className="btn-ghost text-xs" onClick={() => { setMotivo(''); setErrorRechazo(''); setPorRechazar(s) }}>Rechazar</button>
        </>
      )
    }
    if (s.estado === 'APROBADA') {
      return <button type="button" className="btn-primary text-xs" onClick={() => accion(solicitudesHerramientasApi.atender, s, 'Atendida')}>Atender</button>
    }
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargar} />} title="Herramientas" subtitle="Préstamos de herramientas y solicitudes por entregar" />
      {pestanas}

      {(sol.error || pre.error) && <AlertaFormulario mensaje={sol.error || pre.error} />}
      {sol.aviso && <AlertaFormulario tipo="aviso" mensaje={sol.aviso} />}

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
          Solicitudes por entregar {sol.datos && <span className="font-normal text-slate-500">({porEntregar.length})</span>}
        </h2>
        {sol.datos === null ? (
          <Cargando />
        ) : porEntregar.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No hay solicitudes pendientes ni aprobadas.</p>
        ) : (
          <TablaSolicitudes filas={porEntregar} acciones={acciones} />
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">Préstamos</h2>
        {pre.datos === null ? (
          <Cargando />
        ) : pre.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aún no hay préstamos registrados.</p>
        ) : (
          <TablaFicha
            filas={pre.datos}
            compacta
            minWidth="md:min-w-0"
            ficha={{ titulo: (p) => p.herramienta, subtitulo: (p) => p.trabajador }}
            columnas={[
              { titulo: 'Herramienta', movil: true, tdClase: 'text-slate-700', celda: (p) => `${p.herramienta} (${p.codigo_serial})` },
              { titulo: 'Trabajador', movil: true, tdClase: 'text-slate-600', celda: (p) => p.trabajador },
              { titulo: 'Estado', movil: true, celda: (p) => insignia(ESTADOS_PRESTAMO, p.estado_prestamo) },
              { titulo: 'Proyecto', celda: (p) => p.proyecto },
              { titulo: 'Solicitud', celda: (p) => p.solicitud ?? '—' },
              { titulo: 'Entregada', celda: (p) => fmtFecha(p.fecha_prestamo), orden: (p) => p.fecha_prestamo },
              { titulo: 'Devolución estimada', celda: (p) => fmtFecha(p.fecha_estimada_devolucion) },
              { titulo: 'Devuelta', celda: (p) => (p.fecha_real_devolucion ? fmtFecha(p.fecha_real_devolucion) : '—') },
              { titulo: 'Estado al entregar', celda: (p) => p.estado_entrega },
            ]}
          />
        )}
      </section>

      <Modal abierto={porRechazar !== null} titulo="Rechazar solicitud" onCerrar={() => setPorRechazar(null)} ancho="max-w-md">
        <label htmlFor="sh-motivo" className="label">Observación (obligatoria)</label>
        <textarea id="sh-motivo" className="input" rows={3} maxLength={500} value={motivo}
          onChange={(e) => { setMotivo(e.target.value); setErrorRechazo('') }} />
        {errorRechazo && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errorRechazo}</p>}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn-primary" onClick={rechazar}>Rechazar</button>
          <button type="button" className="btn-ghost" onClick={() => setPorRechazar(null)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  )
}
