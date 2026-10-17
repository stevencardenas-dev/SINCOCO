import { useEffect, useState } from 'react'
import ModalFormulario from './ModalFormulario.jsx'
import { useFormulario } from '../hooks/useFormulario'
import { proyectosApi } from '../services/proyectos'
import { actividadesApi } from '../services/actividades'
import { asignacionesApi } from '../services/asignaciones'

const VACIO = { proyecto_id: '', actividad_id: '', fecha_inicio: '', fecha_fin_programada: '' }

/**
 * HU-33 · criterio 6 (CU-33 Alt 3): inicia la asignación (HU-05) de un trabajador
 * desde el resultado de la búsqueda de personal. Usa la misma API de asignaciones,
 * así que valen sus reglas (solape de fechas, trabajador activo, etc.).
 * Si la búsqueda tenía un periodo, sus fechas llegan ya cargadas.
 */
export default function AsignarPersonal({ trabajador, periodo, onCerrar, onAsignado }) {
  const [proyectos, setProyectos] = useState([])
  const [actividades, setActividades] = useState([])

  const formulario = useFormulario(VACIO, {
    enviar: (f) =>
      asignacionesApi.crear({
        trabajador_id: trabajador.id,
        proyecto_id: Number(f.proyecto_id),
        actividad_id: f.actividad_id || null,
        fecha_inicio: f.fecha_inicio,
        fecha_fin_programada: f.fecha_fin_programada || null,
      }),
    alGuardar: () => onAsignado(trabajador),
    error: 'No se pudo asignar al trabajador.',
  })
  const { valores, abierto, abrir, cerrar, cambiar } = formulario

  // Se abre al recibir un trabajador y se cierra al quitarlo.
  useEffect(() => {
    if (!trabajador) return
    abrir({ ...VACIO, fecha_inicio: periodo?.desde ?? '', fecha_fin_programada: periodo?.hasta ?? '' })
    proyectosApi.listar().then((ps) => setProyectos(ps.filter((p) => p.activo))).catch(() => setProyectos([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabajador])

  useEffect(() => {
    setActividades([])
    if (!valores.proyecto_id) return
    actividadesApi.listar({ proyecto_id: valores.proyecto_id }).then(setActividades).catch(() => {})
  }, [valores.proyecto_id])

  if (!trabajador) return null

  const cerrarTodo = () => {
    cerrar()
    onCerrar()
  }

  return (
    <ModalFormulario
      {...formulario.propsModal}
      onCerrar={cerrarTodo}
      titulo="Asignar trabajador"
      subtitulo={`${trabajador.nombres} ${trabajador.apellidos}${trabajador.especialidad ? ` · ${trabajador.especialidad}` : ''}`}
      textoGuardar="Asignar"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="as-proyecto" className="label">Proyecto</label>
          <select id="as-proyecto" className="input" required value={valores.proyecto_id}
            onChange={(e) => { cambiar('proyecto_id', e.target.value); cambiar('actividad_id', '') }}>
            <option value="">Seleccione un proyecto</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="as-actividad" className="label">Alcance</label>
          <select id="as-actividad" className="input" value={valores.actividad_id}
            disabled={!valores.proyecto_id} onChange={(e) => cambiar('actividad_id', e.target.value)}>
            <option value="">Todo el proyecto</option>
            {actividades.filter((a) => a.activo).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="as-inicio" className="label">Inicio</label>
          <input id="as-inicio" type="date" className="input" required value={valores.fecha_inicio}
            onChange={(e) => cambiar('fecha_inicio', e.target.value)} />
        </div>
        <div>
          <label htmlFor="as-fin" className="label">Fin programado</label>
          <input id="as-fin" type="date" className="input" value={valores.fecha_fin_programada}
            min={valores.fecha_inicio || undefined}
            onChange={(e) => cambiar('fecha_fin_programada', e.target.value)} />
        </div>
      </div>
    </ModalFormulario>
  )
}
