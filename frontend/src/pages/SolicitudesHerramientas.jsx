import { useEffect, useState } from 'react'
import { ArrowPathIcon, ClipboardDocumentListIcon, PlusIcon } from '@heroicons/react/24/outline'
import BuscadorSelect from '../components/BuscadorSelect.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import TablaSolicitudes, { ESTADOS_SOLICITUD as ESTADOS } from '../components/TablaSolicitudes.jsx'
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

/**
 * HU-30 (CU-30): solicitud de herramientas.
 * El maestro de obra pide una herramienta disponible para un trabajador; bodega
 * la aprueba o la rechaza (con observación obligatoria) y luego la atiende.
 * Las transiciones y validaciones viven en el backend.
 */

const VACIO = { herramienta_id: '', para_trabajador_id: '', proyecto_id: '', fecha_requerida: '', fecha_estimada_devolucion: '', observaciones: '' }
const hoy = () => new Date().toLocaleDateString('en-CA')

export default function SolicitudesHerramientas({ pestanas }) {
  const { puede, user } = useAuth()
  const puedeCrear = puede('solicitudes_herramientas.crear')

  const [estado, setEstado] = useState('')
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
          <TablaSolicitudes
            filas={datos}
            acciones={(s) =>
              (s.estado === 'PENDIENTE' || s.estado === 'APROBADA') && Number(s.solicitado_por_usuario_id) === Number(user?.id) ? (
                <button type="button" className="btn-ghost text-xs" onClick={() => accion(api.cancelar, s, 'Cancelada')}>
                  Cancelar solicitud
                </button>
              ) : null}
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
            <label htmlFor="sh-trabajador" className="label">Trabajador destinatario</label>
            <BuscadorSelect id="sh-trabajador" requerido error={formulario.campo === 'para_trabajador_id'}
              value={form.para_trabajador_id} onChange={(v) => formulario.cambiar('para_trabajador_id', v)}
              opciones={opciones.trabajadores.filter((t) => t.activo && idsDelProyecto?.has(t.id)).map((t) => ({ value: t.id, label: `${t.nombres} ${t.apellidos}`, sublabel: t.numero_documento }))}
              placeholder={!form.proyecto_id ? 'Elija primero el proyecto' : 'Asignados al proyecto: escriba el nombre…'} />
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
    </div>
  )
}
