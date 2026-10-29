import { useEffect, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { consumosMaterialesApi } from '../services/consumosMateriales'
import { proyectosApi } from '../services/proyectos'
import { actividadesApi } from '../services/actividades'
import { mensajeError } from '../lib/errores'
import { useRecurso } from '../hooks/useRecurso'
import { fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * HU-20 (CU-20): consumo real de materiales por actividad.
 * El maestro de obra registra lo que consumió de lo despachado a la actividad (sin superarlo); el costo se refleja en
 * la consolidación de costos del proyecto. Un consumo erróneo se anula solicitándolo; solo un administrador lo autoriza.
 */
const ESTADOS = {
  REGISTRADO: { texto: 'Registrado', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  ANULACION_SOLICITADA: { texto: 'Anulación solicitada', clase: 'bg-amber-50 text-amber-700 ring-amber-200' },
  ANULADO: { texto: 'Anulado', clase: 'bg-slate-100 text-slate-500 ring-slate-200' },
}
const VACIO = { proyecto_id: '', actividad_id: '', material_id: '', cantidad: '', observaciones: '' }

export default function ConsumosMateriales() {
  const { puede } = useAuth()
  const puedeCrear = puede('consumos_materiales.crear')
  const puedeAutorizar = puede('consumos_materiales.autorizar_anulacion')
  const [form, setForm] = useState(VACIO)
  const [actividades, setActividades] = useState([])
  const [disponibles, setDisponibles] = useState([])
  const [consolidacion, setConsolidacion] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [accion, setAccion] = useState(null) // { tipo: 'solicitar' | 'autorizar' | 'rechazar', consumo, texto }
  const [errorAccion, setErrorAccion] = useState('')
  const consumos = useRecurso(() => consumosMaterialesApi.listar(), [], { mensaje: 'No se pudieron cargar los consumos.' })
  const proyectos = useRecurso(() => proyectosApi.listar(), [], { mensaje: 'No se pudieron cargar los proyectos.' })

  useEffect(() => {
    if (!form.proyecto_id) { setActividades([]); setConsolidacion(null); return }
    actividadesApi.listar({ proyecto_id: form.proyecto_id }).then(setActividades).catch(() => setActividades([]))
    consumosMaterialesApi.consolidacion(form.proyecto_id).then(setConsolidacion).catch(() => setConsolidacion(null))
  }, [form.proyecto_id])

  useEffect(() => {
    if (!form.actividad_id) { setDisponibles([]); return }
    consumosMaterialesApi.disponibles(form.actividad_id).then(setDisponibles).catch(() => setDisponibles([]))
  }, [form.actividad_id])

  const recargarTodo = async () => {
    await consumos.recargar()
    if (form.proyecto_id) consumosMaterialesApi.consolidacion(form.proyecto_id).then(setConsolidacion).catch(() => setConsolidacion(null))
    if (form.actividad_id) consumosMaterialesApi.disponibles(form.actividad_id).then(setDisponibles).catch(() => setDisponibles([]))
  }

  const cambiar = (campo) => (e) => { setForm({ ...form, [campo]: e.target.value }); setError('') }
  const elegirProyecto = (e) => { setForm({ ...VACIO, proyecto_id: e.target.value }); setError('') }
  const elegirActividad = (e) => { setForm({ ...form, actividad_id: e.target.value, material_id: '' }); setError('') }
  const materialElegido = disponibles.find((m) => String(m.material_id) === form.material_id)

  const enviar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setAviso('')
    try {
      const { consumo } = await consumosMaterialesApi.registrar({ ...form, observaciones: form.observaciones.trim() })
      setAviso(`Consumo ${consumo.comprobante} registrado: ${Number(consumo.cantidad)} ${consumo.unidad_medida} de ${consumo.material} por ${fmtCOP(consumo.costo_total)}, ya reflejado en el costo de la actividad y del proyecto.`)
      setForm({ ...VACIO, proyecto_id: form.proyecto_id, actividad_id: form.actividad_id })
      await recargarTodo()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el consumo.'))
    } finally {
      setGuardando(false)
    }
  }

  const abrirAccion = (tipo, consumo) => { setErrorAccion(''); setAccion({ tipo, consumo, texto: '' }) }
  const TITULOS = {
    solicitar: 'Solicitar la anulación del consumo',
    autorizar: 'Autorizar la anulación del consumo',
    rechazar: 'Rechazar la anulación del consumo',
  }
  const confirmarAccion = async () => {
    const { tipo, consumo, texto } = accion
    const t = texto.trim()
    if ((tipo === 'solicitar' || tipo === 'rechazar') && !t) return setErrorAccion(tipo === 'solicitar' ? 'Debe indicar el motivo de la anulación.' : 'Debe indicar la observación que justifica el rechazo.')
    if (tipo === 'autorizar' && consumo.estado === 'REGISTRADO' && !t) return setErrorAccion('Para anular un consumo sin solicitud indique el motivo.')
    try {
      if (tipo === 'solicitar') await consumosMaterialesApi.solicitarAnulacion(consumo.id, t)
      else if (tipo === 'autorizar') await consumosMaterialesApi.autorizarAnulacion(consumo.id, t)
      else await consumosMaterialesApi.rechazarAnulacion(consumo.id, t)
      setAccion(null)
      setAviso(tipo === 'solicitar' ? `Anulación de ${consumo.comprobante} solicitada: queda pendiente de la autorización de un administrador.`
        : tipo === 'autorizar' ? `Consumo ${consumo.comprobante} anulado: su costo ya no cuenta en la actividad ni en el proyecto.`
          : `Anulación de ${consumo.comprobante} rechazada.`)
      await recargarTodo()
    } catch (err) {
      setErrorAccion(mensajeError(err, 'No se pudo completar la acción.'))
    }
  }

  const selectDe = (id, valor, onChange, opciones, vacio = 'Seleccione…', deshabilitado = false) => (
    <select id={id} className="input" value={valor} onChange={onChange} disabled={deshabilitado} required>
      <option value="">{vacio}</option>
      {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  )

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargarTodo} />} title="Consumo de materiales" subtitle="Consumo real por actividad y su costo en el proyecto" />
      {consumos.error && <AlertaFormulario mensaje={consumos.error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {puedeCrear && (
        <form className="card grid gap-4 p-5 sm:grid-cols-2" onSubmit={enviar}>
          <div>
            <label htmlFor="cm-proyecto" className="label">Proyecto</label>
            {selectDe('cm-proyecto', form.proyecto_id, elegirProyecto, (proyectos.datos ?? []).map((p) => [p.id, p.nombre]))}
          </div>
          <div>
            <label htmlFor="cm-actividad" className="label">Actividad</label>
            {selectDe('cm-actividad', form.actividad_id, elegirActividad, actividades.map((a) => [a.id, a.nombre]),
              form.proyecto_id ? 'Seleccione…' : 'Elija primero el proyecto', !form.proyecto_id)}
          </div>
          <div>
            <label htmlFor="cm-material" className="label">Material despachado a la actividad</label>
            {selectDe('cm-material', form.material_id, cambiar('material_id'),
              disponibles.map((m) => [m.material_id, `${m.material_codigo} · ${m.material} (disponible ${m.disponible} ${m.unidad_medida})`]),
              form.actividad_id ? (disponibles.length ? 'Seleccione…' : 'A esta actividad no se le ha despachado material') : 'Elija primero la actividad', !form.actividad_id)}
          </div>
          <div>
            <label htmlFor="cm-cantidad" className="label">Cantidad consumida</label>
            <input id="cm-cantidad" type="number" min="0.01" step="0.01" className="input" value={form.cantidad} onChange={cambiar('cantidad')} required />
            {materialElegido && (
              <p className="mt-1 text-xs text-slate-500">
                Despachado {materialElegido.despachado} · devuelto {materialElegido.devuelto} · ya consumido {materialElegido.consumido} · costo {fmtCOP(materialElegido.costo_unitario)} c/u
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cm-obs" className="label">Observaciones (opcional)</label>
            <input id="cm-obs" className="input" maxLength={500} value={form.observaciones} onChange={cambiar('observaciones')} />
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary disabled:opacity-60" disabled={guardando}>{guardando ? 'Registrando…' : 'Registrar consumo'}</button>
          </div>
        </form>
      )}

      {consolidacion && (
        <section className="card overflow-hidden" aria-label="Consolidación de costos">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
            Costo de materiales consumidos · {consolidacion.proyecto}
            <span className="ml-2 font-normal text-slate-500">Total del proyecto {fmtCOP(consolidacion.costo_materiales_total)}</span>
          </h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {consolidacion.actividades.map((a) => (
              <li key={a.actividad_id} className="flex flex-wrap justify-between gap-2 px-5 py-2">
                <span className="text-slate-700">{a.actividad}</span>
                <span className="tabular-nums text-slate-600">{fmtCOP(a.costo_materiales)} · {a.consumos} consumo(s)</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        {consumos.datos === null ? (
          <p className="card flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : consumos.datos.length === 0 ? (
          <p className="card px-5 py-6 text-sm text-slate-500">Aún no hay consumos registrados.</p>
        ) : consumos.datos.map((c) => (
          <article key={c.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-800">{c.comprobante} · {c.proyecto} · {c.actividad}</h2>
              <span className={`badge ring-1 ${ESTADOS[c.estado]?.clase ?? ''}`}>{ESTADOS[c.estado]?.texto ?? c.estado}</span>
              <span className="text-xs text-slate-500">{c.registrado_por} · {fmtFecha(c.fecha_consumo)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              {c.material_codigo} · {c.material}: {Number(c.cantidad)} {c.unidad_medida} × {fmtCOP(c.costo_unitario)} = <strong>{fmtCOP(c.costo_total)}</strong>
            </p>
            {c.observaciones && <p className="mt-1 text-xs text-slate-500">{c.observaciones}</p>}
            {c.anulacion_motivo && <p className="mt-1 text-xs text-amber-700">Motivo de la anulación: {c.anulacion_motivo}</p>}
            {c.anulacion_observacion && (
              <p className="mt-1 text-xs text-slate-500">Resolución del administrador{c.anulacion_resuelta_por ? ` (${c.anulacion_resuelta_por})` : ''}: {c.anulacion_observacion}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {c.estado === 'REGISTRADO' && puedeCrear && (
                <button type="button" className="btn-ghost text-xs" onClick={() => abrirAccion('solicitar', c)}>Solicitar anulación</button>
              )}
              {c.estado === 'REGISTRADO' && puedeAutorizar && (
                <button type="button" className="btn-ghost text-xs" onClick={() => abrirAccion('autorizar', c)}>Anular</button>
              )}
              {c.estado === 'ANULACION_SOLICITADA' && puedeAutorizar && (
                <>
                  <button type="button" className="btn-primary text-xs" onClick={() => abrirAccion('autorizar', c)}>Autorizar anulación</button>
                  <button type="button" className="btn-ghost text-xs" onClick={() => abrirAccion('rechazar', c)}>Rechazar</button>
                </>
              )}
              {c.estado === 'ANULACION_SOLICITADA' && !puedeAutorizar && (
                <span className="text-xs text-amber-700">Pendiente de la autorización de un administrador.</span>
              )}
            </div>
          </article>
        ))}
      </section>

      <Modal abierto={accion !== null} titulo={accion ? TITULOS[accion.tipo] : ''} onCerrar={() => setAccion(null)} ancho="max-w-md">
        {accion && (
          <>
            <p className="mb-3 text-sm text-slate-600">{accion.consumo.comprobante} · {accion.consumo.material}: {fmtCOP(accion.consumo.costo_total)}</p>
            <label htmlFor="cm-accion" className="label">
              {accion.tipo === 'solicitar' ? 'Motivo de la anulación (obligatorio)'
                : accion.tipo === 'rechazar' ? 'Observación (obligatoria)'
                  : accion.consumo.estado === 'REGISTRADO' ? 'Motivo (obligatorio)' : 'Observación (opcional)'}
            </label>
            <textarea id="cm-accion" className="input" rows={3} maxLength={500} value={accion.texto}
              onChange={(e) => { setAccion({ ...accion, texto: e.target.value }); setErrorAccion('') }} />
            {errorAccion && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errorAccion}</p>}
            <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
              <button type="button" className="btn-primary" onClick={confirmarAccion}>Confirmar</button>
              <button type="button" className="btn-ghost" onClick={() => setAccion(null)}>Cancelar</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
