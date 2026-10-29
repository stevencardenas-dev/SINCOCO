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
import { mensajeError } from '../lib/errores'

/**
 * HU-11 panel de préstamos para bodega (pestaña de Herramientas).
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
  <span className={`badge badge-tabla ring-1 ${mapa[valor] ?? 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{valor}</span>
)

const Cargando = () => (
  <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
    <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
  </p>
)

export default function PrestamosHerramientas({ pestanas }) {
  const { puede } = useAuth()
  const puedeResolver = puede('solicitudes_herramientas.resolver')
  const puedeEntregar = puede('prestamos_herramientas.crear')
  const puedeReemplazar = puede('prestamos_herramientas.reemplazar')
  // HU-35: avería de una herramienta prestada y su reemplazo.
  const [averia, setAveria] = useState(null) // { prestamo, novedad, reemplazo, opciones }
  const [errorAveria, setErrorAveria] = useState('')
  const [guardandoAveria, setGuardandoAveria] = useState(false)
  const [avisoAveria, setAvisoAveria] = useState('')
  const [porEntregarSol, setPorEntregarSol] = useState(null)
  const [entrega, setEntrega] = useState({ fecha_estimada_devolucion: '', observaciones: '' })
  const [errorEntrega, setErrorEntrega] = useState('')
  const [porRechazar, setPorRechazar] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [errorRechazo, setErrorRechazo] = useState('')
  const sol = useRecurso(() => solicitudesHerramientasApi.listar(), [], { mensaje: 'No se pudieron cargar las solicitudes.' })
  const pre = useRecurso(() => prestamosHerramientasApi.listar(), [], { mensaje: 'No se pudieron cargar los préstamos.' })

  const porEntregar = (sol.datos ?? []).filter((s) => s.estado === 'PENDIENTE' || s.estado === 'APROBADA')
  const recargar = () => Promise.all([sol.recargar(), pre.recargar()])

  const VIGENTES = ['ACTIVO', 'ATRASADO', 'CON_NOVEDAD']
  const abrirAveria = async (p) => {
    setErrorAveria('')
    setAveria({ prestamo: p, novedad: '', reemplazo: '', opciones: null })
    try {
      const opciones = await prestamosHerramientasApi.reemplazos(p.id)
      setAveria((a) => (a ? { ...a, opciones } : a))
    } catch (e) {
      setAveria((a) => (a ? { ...a, opciones: [] } : a))
      setErrorAveria(mensajeError(e, 'No se pudieron cargar las herramientas de reemplazo.'))
    }
  }
  const confirmarAveria = async () => {
    if (!averia.novedad.trim()) return setErrorAveria('Debe describir la avería (novedad) para registrar el reemplazo.')
    setGuardandoAveria(true)
    try {
      const r = await prestamosHerramientasApi.reemplazar(averia.prestamo.id, {
        novedad: averia.novedad.trim(), herramienta_reemplazo_id: averia.reemplazo || undefined,
      })
      setAveria(null)
      await recargar()
      setAvisoAveria(r.sugerir_solicitud
        ? 'Avería registrada y préstamo cerrado sin reemplazo. Registre una solicitud de herramienta (Solicitudes) para que el trabajador siga con su labor.'
        : `Avería registrada: el reemplazo (${r.prestamo_reemplazo.herramienta}) quedó entregado a ${r.prestamo_reemplazo.trabajador} con devolución estimada el ${fmtFecha(r.prestamo_reemplazo.fecha_estimada_devolucion)}.`)
    } catch (e) {
      setErrorAveria(mensajeError(e, 'No se pudo registrar la avería.'))
    } finally {
      setGuardandoAveria(false)
    }
  }

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

  const abrirEntrega = (s) => {
    setEntrega({ fecha_estimada_devolucion: String(s.fecha_estimada_devolucion ?? '').slice(0, 10), observaciones: '' })
    setErrorEntrega('')
    setPorEntregarSol(s)
  }

  const entregar = async () => {
    if (!entrega.fecha_estimada_devolucion) return setErrorEntrega('La fecha estimada de devolución es obligatoria.')
    const s = porEntregarSol
    try {
      await prestamosHerramientasApi.entregar({ solicitud_id: s.id, ...entrega, observaciones: entrega.observaciones.trim() })
      setPorEntregarSol(null)
      await recargar()
    } catch (e) {
      setErrorEntrega(mensajeError(e, 'No se pudo registrar la entrega.'))
    }
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
      return puedeEntregar
        ? <button type="button" className="btn-primary text-xs" onClick={() => abrirEntrega(s)}>Entregar</button>
        : null
    }
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargar} />} title="Herramientas" subtitle="Préstamos de herramientas y solicitudes por entregar" />
      {pestanas}

      {(sol.error || pre.error) && <AlertaFormulario mensaje={sol.error || pre.error} />}
      {sol.aviso && <AlertaFormulario tipo="aviso" mensaje={sol.aviso} />}
      {avisoAveria && <AlertaFormulario tipo="aviso" mensaje={avisoAveria} />}

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
              { titulo: 'Entregó', celda: (p) => p.entregado_por ?? '—' },
              { titulo: 'Condiciones de entrega', celda: (p) => p.observaciones_entrega || '—' },
              { titulo: 'Recibió', celda: (p) => (p.fecha_real_devolucion ? p.recibido_por ?? '—' : '—') },
              { titulo: 'Condición al devolver', celda: (p) => p.estado_devolucion ?? '—' },
              { titulo: 'Novedad al devolver', celda: (p) => p.observaciones_devolucion || '—' },
              { titulo: 'Reemplaza a', celda: (p) => p.reemplaza_a ?? '—' },
              { titulo: 'Reemplazado por', celda: (p) => p.reemplazado_por ?? '—' },
              { titulo: 'Incidencia', celda: (p) => (p.incidencia_id ? `#${p.incidencia_id}` : '—') },
              {
                titulo: 'Acciones',
                acciones: true,
                derecha: true,
                celda: (p, enFicha) => (enFicha && puedeReemplazar && VIGENTES.includes(p.estado_prestamo)
                  ? <button type="button" className="btn-primary text-xs" onClick={() => abrirAveria(p)}>Registrar avería y reemplazo</button>
                  : null),
              },
            ]}
          />
        )}
      </section>

      <Modal abierto={porEntregarSol !== null} titulo="Entregar herramienta" onCerrar={() => setPorEntregarSol(null)} ancho="max-w-md">
        {porEntregarSol && (
          <p className="mb-4 text-sm text-slate-600">
            {porEntregarSol.herramienta} ({porEntregarSol.codigo_serial}) → {porEntregarSol.trabajador}
          </p>
        )}
        <label htmlFor="pe-fecha" className="label">Fecha estimada de devolución</label>
        <input id="pe-fecha" type="date" className="input" value={entrega.fecha_estimada_devolucion}
          onChange={(e) => { setEntrega({ ...entrega, fecha_estimada_devolucion: e.target.value }); setErrorEntrega('') }} />
        <label htmlFor="pe-obs" className="label mt-4">Observaciones</label>
        <textarea id="pe-obs" className="input" rows={3} maxLength={500} value={entrega.observaciones}
          onChange={(e) => setEntrega({ ...entrega, observaciones: e.target.value })} />
        {errorEntrega && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errorEntrega}</p>}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn-primary" onClick={entregar}>Registrar entrega</button>
          <button type="button" className="btn-ghost" onClick={() => setPorEntregarSol(null)}>Cancelar</button>
        </div>
      </Modal>

      {/* HU-35: avería de una herramienta prestada, con su reemplazo. */}
      <Modal abierto={averia !== null} titulo="Registrar avería y reemplazo" onCerrar={() => !guardandoAveria && setAveria(null)} ancho="max-w-md">
        {averia && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              {averia.prestamo.herramienta} ({averia.prestamo.codigo_serial}) prestada a {averia.prestamo.trabajador} · devolución estimada {fmtFecha(averia.prestamo.fecha_estimada_devolucion)}
            </p>
            <label htmlFor="av-novedad" className="label">Novedad: descripción de la avería</label>
            <textarea id="av-novedad" className="input" rows={3} maxLength={500} value={averia.novedad}
              onChange={(e) => { setAveria({ ...averia, novedad: e.target.value }); setErrorAveria('') }} />
            <label htmlFor="av-reemplazo" className="label mt-4">Herramienta de reemplazo</label>
            <select id="av-reemplazo" className="input" value={averia.reemplazo} disabled={averia.opciones === null}
              onChange={(e) => setAveria({ ...averia, reemplazo: e.target.value })}>
              <option value="">{averia.opciones === null ? 'Cargando…' : 'Sin reemplazo (cierra solo el préstamo averiado)'}</option>
              {(averia.opciones ?? []).map((h) => (
                <option key={h.id} value={h.id}>{h.nombre} ({h.codigo_serial}) · {h.almacen}{h.equivalente ? ' · equivalente' : ''}</option>
              ))}
            </select>
            {averia.opciones && averia.opciones.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">No hay una herramienta operativa disponible: se cerrará solo el préstamo averiado y deberá registrar una solicitud de herramienta.</p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              La herramienta averiada pasa a reparación y se genera la incidencia. El reemplazo se entrega al mismo trabajador, con la misma fecha estimada de devolución.
            </p>
            {errorAveria && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errorAveria}</p>}
            <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
              <button type="button" className="btn-primary disabled:opacity-60" disabled={guardandoAveria} onClick={confirmarAveria}>
                {guardandoAveria ? 'Registrando…' : 'Confirmar'}
              </button>
              <button type="button" className="btn-ghost" disabled={guardandoAveria} onClick={() => setAveria(null)}>Cancelar</button>
            </div>
          </>
        )}
      </Modal>

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
