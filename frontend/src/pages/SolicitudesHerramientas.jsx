import { useEffect, useState } from 'react'
import { ArrowPathIcon, ClipboardDocumentListIcon, PlusIcon } from '@heroicons/react/24/outline'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
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
import { asignacionesApi } from '../services/asignaciones'
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

const VACIO = { herramienta_id: '', para_trabajador_id: '', proyecto_id: '', fecha_requerida: '', fecha_estimada_devolucion: '', observaciones: '' }
const hoy = () => new Date().toLocaleDateString('en-CA')

export default function SolicitudesHerramientas({ pestanas }) {
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

  // Solo pueden recibir herramientas los trabajadores con asignación vigente en el proyecto elegido.
  const [idsDelProyecto, setIdsDelProyecto] = useState(null)
  useEffect(() => {
    setIdsDelProyecto(null)
    if (!form.proyecto_id) return
    asignacionesApi.listar({ proyecto_id: form.proyecto_id })
      .then((filas) => setIdsDelProyecto(new Set(filas.filter((a) => a.estado === 'ACTIVO').map((a) => a.trabajador_id))))
      .catch(() => setIdsDelProyecto(new Set()))
  }, [form.proyecto_id])

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

      {pestanas}

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
              { titulo: 'Devolución esperada', tdClase: 'text-slate-600', celda: (s) => (s.fecha_estimada_devolucion ? fmtFecha(s.fecha_estimada_devolucion) : '—'), orden: (s) => s.fecha_estimada_devolucion ?? '' },
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
          <BuscadorSelect id="sh-herramienta" requerido error={Boolean(formulario.campo === 'herramienta_id')}
            value={form.herramienta_id} onChange={(v) => formulario.cambiar('herramienta_id', v)}
            opciones={opciones.herramientas.map((h) => ({ value: h.id, label: h.nombre, sublabel: `${h.codigo_serial}${h.marca ? ` · ${h.marca}` : ''}` }))}
            placeholder="Escriba el nombre o el serial…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sh-proyecto" className="label">Proyecto</label>
            <BuscadorSelect id="sh-proyecto" requerido error={formulario.campo === 'proyecto_id'}
              value={form.proyecto_id} onChange={(v) => { formulario.cambiar('proyecto_id', v); formulario.cambiar('para_trabajador_id', '') }}
              opciones={opciones.proyectos.map((p) => ({ value: p.id, label: p.nombre, sublabel: p.codigo }))}
              placeholder="Escriba el nombre o el código…" />
          </div>
          <div>
            <label htmlFor="sh-trabajador" className="label">Trabajador destinatario (asignado al proyecto)</label>
            <BuscadorSelect id="sh-trabajador" requerido error={formulario.campo === 'para_trabajador_id'}
              value={form.para_trabajador_id} onChange={(v) => formulario.cambiar('para_trabajador_id', v)}
              opciones={opciones.trabajadores.filter((t) => t.activo && idsDelProyecto?.has(t.id)).map((t) => ({ value: t.id, label: `${t.nombres} ${t.apellidos}`, sublabel: t.numero_documento }))}
              placeholder={!form.proyecto_id ? 'Elija primero el proyecto' : 'Escriba el nombre o el documento…'} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sh-fecha" className="label">Fecha requerida</label>
            <input id="sh-fecha" type="date" className={campo('fecha_requerida')} required min={hoy()} value={form.fecha_requerida}
              onChange={(e) => formulario.cambiar('fecha_requerida', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sh-devolucion" className="label">Devolución esperada</label>
            <input id="sh-devolucion" type="date" className={campo('fecha_estimada_devolucion')} required
              min={form.fecha_requerida || hoy()} value={form.fecha_estimada_devolucion}
              onChange={(e) => formulario.cambiar('fecha_estimada_devolucion', e.target.value)} />
          </div>
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
