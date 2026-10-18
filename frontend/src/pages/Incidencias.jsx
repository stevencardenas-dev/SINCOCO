import { useEffect, useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import FilaVacia from '../components/FilaVacia.jsx'
import PageHeader from '../components/PageHeader.jsx'
import CampoFoto from '../components/CampoFoto.jsx'
import FotoEvidencia from '../components/FotoEvidencia.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { incidenciasApi } from '../services/incidencias'
import { proyectosApi } from '../services/proyectos'
import { actividadesApi } from '../services/actividades'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'
import { estadoIncidente, severidadIncidente, fmtFecha, fmtFechaHora } from '../lib/format.js'

/**
 * HU-14 (CU-14): incidencias de obra (avería, accidente o retraso).
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - toda incidencia lleva proyecto, título, descripción, tipo y severidad;
 *   - la actividad es opcional, pero si se indica debe ser del proyecto;
 *   - el seguimiento avanza Abierta → En revisión → Resuelta → Cerrada y al
 *     resolverla queda registrada la fecha de resolución;
 *   - las de severidad Alta o Crítica generan una alerta y avisan por correo al
 *     responsable del proyecto, y resaltan la actividad en el plan de trabajo.
 */

const TIPOS = [
  { value: 'AVERIA', label: 'Avería' },
  { value: 'ACCIDENTE', label: 'Accidente' },
  { value: 'RETRASO', label: 'Retraso' },
]
const etiquetaTipo = (v) => TIPOS.find((t) => t.value === v)?.label ?? v

const SIGUIENTES = {
  ABIERTA: ['EN_REVISION', 'RESUELTA', 'CERRADA'],
  EN_REVISION: ['RESUELTA', 'CERRADA'],
  RESUELTA: ['CERRADA'],
  CERRADA: [],
}

const VACIO = { proyecto_id: '', actividad_id: '', tipo: '', titulo: '', descripcion: '', severidad: 'MEDIA', evidencia: '', foto: '' }
const SIN_FILTROS = { proyecto_id: '', estado: '', severidad: '' }
const VACIO_SEGUIMIENTO = { estado: '', fecha_resolucion: '' }

const Insignia = ({ mapa, valor }) => {
  const e = mapa[valor]
  return <span className={`badge ${e?.cls ?? ''}`}>{e?.label ?? valor}</span>
}

export default function Incidencias() {
  const { puede } = useAuth()
  const puedeCrear = puede('incidencias.crear')
  const puedeEditar = puede('incidencias.editar')

  const [proyectos, setProyectos] = useState([])
  const [actividades, setActividades] = useState([])
  const { filtros, cambiar: cambiarFiltro, limpiar: limpiarFiltros, activos: filtrosActivos, hayFiltros } =
    useFiltros(SIN_FILTROS)

  const { datos: incidencias, error, aviso, setAviso, recargar } = useRecurso(
    () => incidenciasApi.listar(filtros),
    [filtros],
    { mensaje: 'No se pudo cargar las incidencias.' },
  )

  useEffect(() => {
    proyectosApi.listar().then(setProyectos).catch(() => {})
  }, [])

  const registro = useFormulario(VACIO, {
    enviar: (f) =>
      incidenciasApi.crear({
        ...f,
        proyecto_id: Number(f.proyecto_id),
        actividad_id: f.actividad_id ? Number(f.actividad_id) : '',
      }),
    alGuardar: (r) => {
      const avisos = r.alerta_generada
        ? r.correo_enviado
          ? ' Se generó una alerta y se avisó por correo al responsable del proyecto.'
          : ' Se generó una alerta para el responsable del proyecto.'
        : ''
      setAviso(`Incidencia «${r.titulo}» registrada.${avisos}`)
      return recargar()
    },
    error: 'No se pudo registrar la incidencia.',
  })
  const form = registro.valores
  const campo = registro.claseCampo

  // Las actividades dependen del proyecto elegido en el formulario.
  useEffect(() => {
    setActividades([])
    if (!form.proyecto_id) return
    actividadesApi.listar({ proyecto_id: form.proyecto_id }).then(setActividades).catch(() => {})
  }, [form.proyecto_id])

  const seguimiento = useFormulario(VACIO_SEGUIMIENTO, {
    enviar: (f, inc) =>
      incidenciasApi.actualizar(inc.id, {
        ...(f.estado && f.estado !== inc.estado ? { estado: f.estado } : {}),
        ...(f.fecha_resolucion ? { fecha_resolucion: f.fecha_resolucion } : {}),
      }),
    alGuardar: (r) => {
      setAviso(`Incidencia «${r.titulo}»: ${estadoIncidente[r.estado]?.label ?? r.estado}.`)
      return recargar()
    },
    error: 'No se pudo actualizar la incidencia.',
  })
  const enSeguimiento = seguimiento.registro
  const sf = seguimiento.valores
  const pasaAResuelta = ['RESUELTA', 'CERRADA'].includes(sf.estado)

  const abrirSeguimiento = (inc) => {
    setAviso('')
    seguimiento.abrir({ estado: '', fecha_resolucion: '' }, inc)
  }

  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={recargar} />}
        title="Incidencias de obra"
        subtitle="Averías, accidentes y retrasos, con seguimiento hasta su resolución"
      >
        {puedeCrear && (
          <button className="btn-primary" onClick={() => { setAviso(''); registro.abrir() }}>
            <PlusIcon className="h-5 w-5" /> Registrar incidencia
          </button>
        )}
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      <FiltrosDesplegable titulo="Filtrar incidencias" ariaLabel="Filtros de incidencias" activos={filtrosActivos}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="inc-f-proyecto" className="label">Proyecto</label>
            <select id="inc-f-proyecto" className="input" value={filtros.proyecto_id}
              onChange={(e) => cambiarFiltro('proyecto_id', e.target.value)}>
              <option value="">Todos</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="inc-f-estado" className="label">Estado</label>
            <select id="inc-f-estado" className="input" value={filtros.estado}
              onChange={(e) => cambiarFiltro('estado', e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(estadoIncidente).map(([v, e]) => <option key={v} value={v}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="inc-f-severidad" className="label">Severidad</label>
            <select id="inc-f-severidad" className="input" value={filtros.severidad}
              onChange={(e) => cambiarFiltro('severidad', e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(severidadIncidente).map(([v, e]) => <option key={v} value={v}>{e.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-ghost" disabled={!hayFiltros} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>
      </FiltrosDesplegable>

      {incidencias !== null && incidencias.length === 0 && (
        <div className="card">
          <table className="w-full"><tbody>
            <FilaVacia columnas={1}>
              {hayFiltros ? 'No hay incidencias con los filtros aplicados.' : 'Todavía no se ha registrado ninguna incidencia.'}
            </FilaVacia>
          </tbody></table>
        </div>
      )}

      {incidencias !== null && incidencias.length > 0 && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={incidencias}
            minWidth="md:min-w-[900px]"
            filaClase={() => 'transition hover:bg-slate-50/70'}
            ficha={{ titulo: (i) => i.titulo, subtitulo: (i) => i.proyecto_nombre }}
            columnas={[
              {
                titulo: 'Incidencia',
                movil: true,
                tdClase: 'text-slate-800',
                celda: (i) => (
                  <>
                    <span className="font-medium">{i.titulo}</span>
                    <span className="block text-xs text-slate-400">{etiquetaTipo(i.tipo)} · {i.proyecto_nombre}</span>
                  </>
                ),
                valor: (i) =>
                  [`${i.titulo} (${etiquetaTipo(i.tipo)})`, i.descripcion, i.evidencia && `Evidencia: ${i.evidencia}`]
                    .filter(Boolean)
                    .join(' · '),
              },
              { titulo: 'Actividad', tdClase: 'text-slate-600', celda: (i) => i.actividad_nombre ?? '—' },
              { titulo: 'Severidad', movil: true, celda: (i) => <Insignia mapa={severidadIncidente} valor={i.severidad} />,
                valor: (i) => severidadIncidente[i.severidad]?.label },
              { titulo: 'Estado', movil: true, celda: (i) => <Insignia mapa={estadoIncidente} valor={i.estado} />,
                valor: (i) => estadoIncidente[i.estado]?.label },
              { titulo: 'Registrada', tdClase: 'text-slate-600', celda: (i) => fmtFechaHora(i.fecha_incidencia),
                valor: (i) => `${fmtFechaHora(i.fecha_incidencia)} · ${i.reportado_por}` },
              { titulo: 'Foto', tdClase: 'text-slate-600', celda: (i) => (i.evidencia_archivo ? <FotoEvidencia id={i.id} /> : '—') },
              { titulo: 'Resolución', tdClase: 'text-slate-600', celda: (i) => (i.fecha_resolucion ? fmtFecha(i.fecha_resolucion) : '—') },
              ...(puedeEditar
                ? [{
                    titulo: 'Acciones',
                    acciones: true,
                    celda: (i) =>
                      SIGUIENTES[i.estado].length > 0 && (
                        <button type="button" className="btn-accion" onClick={() => abrirSeguimiento(i)}>
                          Dar seguimiento
                        </button>
                      ),
                  }]
                : []),
            ]}
          />
        </div>
      )}

      {puedeCrear && (
        <ModalFormulario
          {...registro.propsModal}
          titulo="Registrar incidencia"
          subtitulo="Las de severidad alta o crítica avisan de inmediato al responsable del proyecto"
          ancho="max-w-3xl"
          textoGuardar="Registrar incidencia"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="inc-proyecto" className="label">Proyecto</label>
              <select id="inc-proyecto" className={campo('proyecto_id')} value={form.proyecto_id} required
                onChange={(e) => { registro.cambiar('proyecto_id', e.target.value); registro.cambiar('actividad_id', '') }}>
                <option value="">Seleccione un proyecto…</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inc-actividad" className="label">Actividad afectada (opcional)</label>
              <select id="inc-actividad" className={campo('actividad_id')} value={form.actividad_id}
                disabled={!form.proyecto_id} onChange={(e) => registro.cambiar('actividad_id', e.target.value)}>
                <option value="">Ninguna en particular</option>
                {actividades.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inc-tipo" className="label">Tipo</label>
              <select id="inc-tipo" className={campo('tipo')} value={form.tipo} required
                onChange={(e) => registro.cambiar('tipo', e.target.value)}>
                <option value="">Seleccione el tipo…</option>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inc-severidad" className="label">Severidad</label>
              <select id="inc-severidad" className={campo('severidad')} value={form.severidad} required
                onChange={(e) => registro.cambiar('severidad', e.target.value)}>
                {Object.entries(severidadIncidente).map(([v, e]) => <option key={v} value={v}>{e.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="inc-titulo" className="label">Título</label>
              <input id="inc-titulo" maxLength={150} className={campo('titulo')} value={form.titulo} required
                onChange={(e) => registro.cambiar('titulo', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="inc-descripcion" className="label">Descripción del hecho</label>
              <textarea id="inc-descripcion" rows={4} className={campo('descripcion')} value={form.descripcion} required
                onChange={(e) => registro.cambiar('descripcion', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <span className="label">Foto de la evidencia (opcional)</span>
              <CampoFoto value={form.foto} onChange={(v) => registro.cambiar('foto', v)} />
              <label htmlFor="inc-evidencia" className="label mt-3">Enlace a un documento (opcional)</label>
              <input id="inc-evidencia" maxLength={500} className={campo('evidencia')} value={form.evidencia}
                placeholder="Enlace al documento que respalda el hecho"
                onChange={(e) => registro.cambiar('evidencia', e.target.value)} />
            </div>
          </div>
        </ModalFormulario>
      )}

      {puedeEditar && enSeguimiento && (
        <ModalFormulario
          {...seguimiento.propsModal}
          titulo="Seguimiento de la incidencia"
          subtitulo={enSeguimiento.titulo}
          textoGuardar="Guardar seguimiento"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="seg-estado" className="label">Nuevo estado</label>
              <select id="seg-estado" className={seguimiento.claseCampo('estado')} value={sf.estado} required
                onChange={(e) => seguimiento.cambiar('estado', e.target.value)}>
                <option value="">Seleccione…</option>
                {SIGUIENTES[enSeguimiento.estado].map((e) => (
                  <option key={e} value={e}>{estadoIncidente[e].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="seg-fecha" className="label">Fecha de resolución</label>
              <input id="seg-fecha" type="date" max={hoy} disabled={!pasaAResuelta}
                className={seguimiento.claseCampo('fecha_resolucion')} value={sf.fecha_resolucion}
                onChange={(e) => seguimiento.cambiar('fecha_resolucion', e.target.value)} />
              <p className="mt-1 text-xs text-slate-500">Si la deja vacía se usa la de hoy.</p>
            </div>
          </div>
        </ModalFormulario>
      )}
    </div>
  )
}
