import { useEffect, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { devolucionesMaterialesApi } from '../services/devolucionesMateriales'
import { mensajeError } from '../lib/errores'
import { useRecurso } from '../hooks/useRecurso'
import { fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * HU-09 (CU-09): devolución de materiales sobrantes.
 * Bodega registra lo que vuelve de un proyecto o actividad: almacén de destino, proyecto, actividad de origen y,
 * si aplica, la salida que lo originó; quién lo entrega, quién lo recibe, la cantidad y el motivo (obligatorio).
 * Si el material es apto suma a la existencia y ajusta el costo de la actividad; si no, se registra sin sumarlo.
 */
const VACIO = {
  proyecto_id: '', actividad_id: '', salida_origen_id: '', almacen_id: '', devuelto_por_trabajador_id: '',
  material_id: '', cantidad: '', apto: true, motivo: '',
}

export default function DevolucionesMateriales() {
  const { puede } = useAuth()
  const puedeCrear = puede('devoluciones_materiales.crear')
  const [form, setForm] = useState(VACIO)
  const [actividades, setActividades] = useState([])
  const [salidas, setSalidas] = useState([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const devoluciones = useRecurso(() => devolucionesMaterialesApi.listar(), [], { mensaje: 'No se pudieron cargar las devoluciones.' })
  const opciones = useRecurso(() => (puedeCrear ? devolucionesMaterialesApi.opciones() : Promise.resolve(null)), [puedeCrear], { mensaje: 'No se pudieron cargar las opciones del formulario.' })

  // Al elegir el proyecto se cargan sus actividades y sus salidas (para indicar cuál originó la devolución).
  useEffect(() => {
    if (!form.proyecto_id) { setActividades([]); setSalidas([]); return }
    devolucionesMaterialesApi.actividades(form.proyecto_id).then(setActividades).catch(() => setActividades([]))
    devolucionesMaterialesApi.salidas(form.proyecto_id).then(setSalidas).catch(() => setSalidas([]))
  }, [form.proyecto_id])

  const cambiar = (campo) => (e) => { setForm({ ...form, [campo]: e.target.value }); setError('') }
  const elegirProyecto = (e) => { setForm({ ...form, proyecto_id: e.target.value, actividad_id: '', salida_origen_id: '' }); setError('') }
  const elegirSalida = (e) => {
    const salida = salidas.find((s) => String(s.id) === e.target.value)
    // La salida fija la actividad (si la tiene); el material se elige entre los que ella despachó.
    setForm({ ...form, salida_origen_id: e.target.value, actividad_id: salida?.actividad_id ? String(salida.actividad_id) : form.actividad_id, material_id: '' })
    setError('')
  }

  const salidaElegida = salidas.find((s) => String(s.id) === form.salida_origen_id)
  const materiales = salidaElegida
    ? salidaElegida.materiales.map((m) => ({ id: m.material_id, codigo: m.material_codigo, descripcion: m.material, disponible: m.disponible_devolver, unidad: m.unidad_medida }))
    : (opciones.datos?.materiales ?? []).map((m) => ({ id: m.id, codigo: m.codigo, descripcion: m.descripcion, unidad: m.unidad_medida }))

  const enviar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setAviso('')
    try {
      const { devolucion } = await devolucionesMaterialesApi.registrar({ ...form, motivo: form.motivo.trim() })
      setAviso(
        devolucion.apto
          ? `Devolución ${devolucion.comprobante} registrada: se sumaron ${Number(devolucion.cantidad)} ${devolucion.unidad_medida} a la existencia y el costo de la actividad se ajustó en ${fmtCOP(devolucion.ajuste_costo)}.`
          : `Devolución ${devolucion.comprobante} registrada como material no apto: no se sumó a la existencia.`,
      )
      setForm(VACIO)
      await devoluciones.recargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la devolución.'))
    } finally {
      setGuardando(false)
    }
  }

  const selectDe = (id, valor, onChange, opcionesSelect, vacio = 'Seleccione…', deshabilitado = false) => (
    <select id={id} className="input" value={valor} onChange={onChange} disabled={deshabilitado} required={!vacio.startsWith('Sin ')}>
      <option value="">{vacio}</option>
      {opcionesSelect.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  )

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={devoluciones.recargar} />} title="Devolución de materiales" subtitle="Materiales sobrantes que regresan de un proyecto o actividad" />
      {devoluciones.error && <AlertaFormulario mensaje={devoluciones.error} />}
      {opciones.error && <AlertaFormulario mensaje={opciones.error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {puedeCrear && (
        <form className="card grid gap-4 p-5 sm:grid-cols-2" onSubmit={enviar}>
          <div>
            <label htmlFor="dv-proyecto" className="label">Proyecto de origen</label>
            {selectDe('dv-proyecto', form.proyecto_id, elegirProyecto, (opciones.datos?.proyectos ?? []).map((p) => [p.id, `${p.codigo} · ${p.nombre}`]))}
          </div>
          <div>
            <label htmlFor="dv-actividad" className="label">Actividad de origen</label>
            {selectDe('dv-actividad', form.actividad_id, cambiar('actividad_id'), actividades.map((a) => [a.id, a.nombre]),
              form.proyecto_id ? 'Seleccione…' : 'Elija primero el proyecto', !form.proyecto_id || Boolean(salidaElegida?.actividad_id))}
          </div>
          <div>
            <label htmlFor="dv-salida" className="label">Salida que la originó (opcional)</label>
            {selectDe('dv-salida', form.salida_origen_id, elegirSalida,
              salidas.map((s) => [s.id, `${s.codigo} · ${fmtFecha(s.fecha_salida)}`]), 'Sin salida de origen', !form.proyecto_id)}
          </div>
          <div>
            <label htmlFor="dv-almacen" className="label">Almacén de destino</label>
            {selectDe('dv-almacen', form.almacen_id, cambiar('almacen_id'), (opciones.datos?.almacenes ?? []).map((a) => [a.id, a.nombre]))}
          </div>
          <div>
            <label htmlFor="dv-trabajador" className="label">Quién entrega</label>
            {selectDe('dv-trabajador', form.devuelto_por_trabajador_id, cambiar('devuelto_por_trabajador_id'), (opciones.datos?.trabajadores ?? []).map((t) => [t.id, t.nombre]))}
          </div>
          <div>
            <p className="label">Quién recibe</p>
            <p className="input flex items-center bg-slate-50 text-slate-600">Usted (queda registrado al confirmar)</p>
          </div>
          <div>
            <label htmlFor="dv-material" className="label">Material</label>
            {selectDe('dv-material', form.material_id, cambiar('material_id'),
              materiales.map((m) => [m.id, `${m.codigo} · ${m.descripcion}${m.disponible !== undefined ? ` (por devolver ${m.disponible} ${m.unidad})` : ''}`]))}
          </div>
          <div>
            <label htmlFor="dv-cantidad" className="label">Cantidad</label>
            <input id="dv-cantidad" type="number" min="0.01" step="0.01" className="input" value={form.cantidad} onChange={cambiar('cantidad')} required />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" className="mt-0.5" checked={form.apto} onChange={(e) => { setForm({ ...form, apto: e.target.checked }); setError('') }} />
              <span>El material está en condiciones de reingresar al inventario</span>
            </label>
            {!form.apto && <p className="mt-1 text-xs text-amber-700">No se sumará a la existencia: explique en el motivo por qué no es apto.</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="dv-motivo" className="label">Motivo de la devolución</label>
            <textarea id="dv-motivo" className="input" rows={2} maxLength={500} value={form.motivo} onChange={cambiar('motivo')} required />
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary disabled:opacity-60" disabled={guardando}>
              {guardando ? 'Registrando…' : 'Registrar devolución'}
            </button>
          </div>
        </form>
      )}

      <section className="card overflow-hidden">
        {devoluciones.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : devoluciones.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aún no hay devoluciones registradas.</p>
        ) : (
          <TablaFicha
            filas={devoluciones.datos}
            compacta
            minWidth="md:min-w-0"
            ficha={{ titulo: (d) => d.comprobante, subtitulo: (d) => d.material }}
            columnas={[
              { titulo: 'Comprobante', movil: true, celda: (d) => d.comprobante },
              { titulo: 'Material', movil: true, celda: (d) => `${d.material_codigo} · ${d.material}` },
              { titulo: 'Cantidad', movil: true, celda: (d) => `${Number(d.cantidad)} ${d.unidad_medida}` },
              { titulo: 'Reingresa', movil: true, celda: (d) => (d.apto ? 'Sí' : 'No (material no apto)') },
              { titulo: 'Proyecto', celda: (d) => d.proyecto },
              { titulo: 'Actividad', celda: (d) => d.actividad ?? '—' },
              { titulo: 'Salida de origen', celda: (d) => d.salida_origen ?? '—' },
              { titulo: 'Almacén de destino', celda: (d) => d.almacen },
              { titulo: 'Entregó', celda: (d) => d.devuelto_por },
              { titulo: 'Recibió', celda: (d) => d.recibido_por },
              { titulo: 'Ajuste al costo de la actividad', celda: (d) => (d.apto ? fmtCOP(d.ajuste_costo) : '—') },
              { titulo: 'Motivo', celda: (d) => d.motivo },
              { titulo: 'Fecha', celda: (d) => fmtFecha(d.fecha_devolucion), orden: (d) => d.fecha_devolucion },
            ]}
          />
        )}
      </section>
    </div>
  )
}
