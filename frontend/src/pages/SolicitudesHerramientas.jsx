import { useEffect, useState } from 'react'
import { ArrowPathIcon, ClipboardDocumentListIcon, PlusIcon } from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { solicitudesHerramientasApi as api } from '../services/solicitudesHerramientas'
import { herramientasApi } from '../services/herramientas'
import { trabajadoresApi } from '../services/trabajadores'
import { proyectosApi } from '../services/proyectos'
import { useRecurso } from '../hooks/useRecurso'
import { useFormulario } from '../hooks/useFormulario'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-30 (CU-30): solicitud de herramientas.
 * El maestro de obra pide una herramienta disponible para un trabajador; bodega
 * la aprueba o la rechaza (con observación obligatoria) y luego la atiende.
 * Las transiciones y validaciones viven en el backend.
 */

const ESTADOS = {
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-amber-50 text-amber-700 ring-amber-200' },
  APROBADA: { texto: 'Aprobada', clase: 'bg-sky-50 text-sky-700 ring-sky-200' },
  RECHAZADA: { texto: 'Rechazada', clase: 'bg-red-50 text-red-700 ring-red-200' },
  ENTREGADA: { texto: 'Atendida', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELADA: { texto: 'Cancelada', clase: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

const VACIO = { herramienta_id: '', para_trabajador_id: '', proyecto_id: '', fecha_requerida: '', observaciones: '' }
const hoy = () => new Date().toLocaleDateString('en-CA')

export default function SolicitudesHerramientas() {
  const { puede } = useAuth()
  const puedeCrear = puede('solicitudes_herramientas.crear')
  const puedeResolver = puede('solicitudes_herramientas.resolver')

  const [estado, setEstado] = useState('')
  const [porRechazar, setPorRechazar] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [errorRechazo, setErrorRechazo] = useState('')
  const [opciones, setOpciones] = useState({ herramientas: [], trabajadores: [], proyectos: [] })

  const { datos, error, aviso, setAviso, recargar, ejecutar } = useRecurso(
    () => api.listar({ estado }),
    [estado],
    { mensaje: 'No se pudieron cargar las solicitudes.' },
  )

  // Solo herramientas con disponibilidad real (prestables) en el selector.
  const cargarOpciones = () =>
    Promise.all([
      herramientasApi.listar({ prestable: true }),
      trabajadoresApi.listar(),
      proyectosApi.listar(),
    ])
      .then(([herramientas, trabajadores, proyectos]) => setOpciones({ herramientas, trabajadores, proyectos }))
      .catch(() => {})
  useEffect(() => { if (puedeCrear) cargarOpciones() }, [puedeCrear])

  const formulario = useFormulario(VACIO, {
    enviar: (f) => api.crear({ ...f, herramienta_id: Number(f.herramienta_id), para_trabajador_id: Number(f.para_trabajador_id), proyecto_id: Number(f.proyecto_id) }),
    alGuardar: ({ solicitud }) => {
      setAviso(`Solicitud ${solicitud.codigo} registrada: queda pendiente de aprobación por bodega.`)
      return Promise.all([recargar(), cargarOpciones()])
    },
    error: 'No se pudo registrar la solicitud.',
  })
  const form = formulario.valores
  const campo = formulario.claseCampo

  const accion = (fn, s, exito) =>
    ejecutar(() => fn(s.id), { exito: `${exito} ${s.codigo}.`, error: 'No se pudo completar la acción.' })

  const rechazar = async () => {
    if (!motivo.trim()) return setErrorRechazo('Debe indicar la observación que justifica el rechazo.')
    const s = porRechazar
    setPorRechazar(null)
    await ejecutar(() => api.rechazar(s.id, motivo.trim()), { exito: `Solicitud ${s.codigo} rechazada.`, error: 'No se pudo rechazar la solicitud.' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={recargar} />}
        title="Solicitud de herramientas"
        subtitle="Pida herramientas al inventario para sus trabajadores y siga su aprobación"
      >
        {puedeCrear && (
          <button type="button" className="btn-primary" onClick={() => { setAviso(''); formulario.abrir() }}>
            <PlusIcon className="h-5 w-5" /> Nueva solicitud
          </button>
        )}
        <select className="input w-auto" aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.texto}</option>)}
        </select>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {datos === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando solicitudes…
        </div>
      )}

      {datos !== null && datos.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <ClipboardDocumentListIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No hay solicitudes de herramientas</p>
        </div>
      )}

      {datos !== null && datos.length > 0 && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={datos}
            minWidth="md:min-w-[900px]"
            ficha={{ titulo: (s) => s.herramienta, subtitulo: (s) => s.codigo }}
            columnas={[
              { titulo: 'Código', movil: true, tdClase: 'font-medium tabular-nums text-slate-800', celda: (s) => s.codigo },
              { titulo: 'Herramienta', movil: true, tdClase: 'text-slate-700', celda: (s) => `${s.herramienta} (${s.codigo_serial})` },
              { titulo: 'Trabajador', tdClase: 'text-slate-600', celda: (s) => s.trabajador },
              { titulo: 'Proyecto', tdClase: 'text-slate-600', celda: (s) => s.proyecto },
              { titulo: 'Solicitante', tdClase: 'text-slate-600', celda: (s) => s.solicitante },
              { titulo: 'Solicitada', tdClase: 'text-slate-600', celda: (s) => fmtFecha(s.fecha_solicitud), orden: (s) => s.fecha_solicitud },
              { titulo: 'Requerida', tdClase: 'text-slate-600', celda: (s) => fmtFecha(s.fecha_requerida), orden: (s) => s.fecha_requerida },
              {
                titulo: 'Estado',
                movil: true,
                celda: (s) => (
                  <>
                    <span className={`badge ring-1 ${ESTADOS[s.estado]?.clase}`}>{ESTADOS[s.estado]?.texto ?? s.estado}</span>
                    {s.observaciones && <p className="mt-1 max-w-xs text-xs text-slate-500">{s.observaciones}</p>}
                  </>
                ),
              },
              {
                titulo: 'Acciones',
                acciones: true,
                derecha: true,
                celda: (s, enFicha) => {
                  const abierta = s.estado === 'PENDIENTE' || s.estado === 'APROBADA'
                  const botones = (
                    <>
                      {puedeResolver && s.estado === 'PENDIENTE' && (
                        <>
                          <button type="button" className="btn-ghost text-xs" onClick={() => accion(api.aprobar, s, 'Aprobada')}>Aprobar</button>
                          <button type="button" className="btn-ghost text-xs" onClick={() => { setMotivo(''); setErrorRechazo(''); setPorRechazar(s) }}>Rechazar</button>
                        </>
                      )}
                      {puedeResolver && s.estado === 'APROBADA' && (
                        <button type="button" className="btn-ghost text-xs" onClick={() => accion(api.atender, s, 'Atendida')}>Atender</button>
                      )}
                      {abierta && (
                        <button type="button" className="btn-ghost text-xs" onClick={() => accion(api.cancelar, s, 'Cancelada')}>Cancelar</button>
                      )}
                    </>
                  )
                  return enFicha ? botones : <div className="flex items-center justify-end gap-2">{botones}</div>
                },
              },
            ]}
          />
        </div>
      )}

      <ModalFormulario
        {...formulario.propsModal}
        titulo="Nueva solicitud de herramienta"
        subtitulo="Queda pendiente de aprobación por bodega"
        textoGuardar="Solicitar"
        espaciado="space-y-4"
      >
        <div>
          <label htmlFor="sh-herramienta" className="label">Herramienta (solo disponibles)</label>
          <select id="sh-herramienta" className={campo('herramienta_id')} required value={form.herramienta_id}
            onChange={(e) => formulario.cambiar('herramienta_id', e.target.value)}>
            <option value="">Seleccione…</option>
            {opciones.herramientas.map((h) => <option key={h.id} value={h.id}>{h.nombre} · {h.codigo_serial}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sh-trabajador" className="label">Trabajador destinatario</label>
            <select id="sh-trabajador" className={campo('para_trabajador_id')} required value={form.para_trabajador_id}
              onChange={(e) => formulario.cambiar('para_trabajador_id', e.target.value)}>
              <option value="">Seleccione…</option>
              {opciones.trabajadores.filter((t) => t.activo).map((t) => <option key={t.id} value={t.id}>{t.nombres} {t.apellidos}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sh-proyecto" className="label">Proyecto</label>
            <select id="sh-proyecto" className={campo('proyecto_id')} required value={form.proyecto_id}
              onChange={(e) => formulario.cambiar('proyecto_id', e.target.value)}>
              <option value="">Seleccione…</option>
              {opciones.proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="sh-fecha" className="label">Fecha requerida</label>
          <input id="sh-fecha" type="date" className={campo('fecha_requerida')} required min={hoy()} value={form.fecha_requerida}
            onChange={(e) => formulario.cambiar('fecha_requerida', e.target.value)} />
        </div>
        <div>
          <label htmlFor="sh-obs" className="label">Observaciones (opcional)</label>
          <textarea id="sh-obs" className={campo('observaciones')} rows={2} maxLength={500} value={form.observaciones}
            onChange={(e) => formulario.cambiar('observaciones', e.target.value)} />
        </div>
      </ModalFormulario>

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
