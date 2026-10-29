import { useEffect, useState } from 'react'
import { ArrowPathIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { solicitudesMaterialesApi } from '../services/solicitudesMateriales'
import { notificacionesApi } from '../services/notificaciones'
import { salidasMaterialesApi } from '../services/salidasMateriales'
import { mensajeError } from '../lib/errores'
import { proyectosApi } from '../services/proyectos'
import { actividadesApi } from '../services/actividades'
import { trabajadoresApi } from '../services/trabajadores'
import { herramientasApi } from '../services/herramientas'
import { useRecurso } from '../hooks/useRecurso'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-08 (CU-08): solicitud de materiales (pestaña Materiales de Solicitudes).
 * El maestro de obra pide materiales para una actividad de su proyecto; bodega recibe
 * el aviso, aprueba (total o parcial), rechaza o despacha. Estados: pendiente,
 * aprobada, despachada (parcial/total), rechazada y cancelada.
 */
const ESTADOS = {
  PENDIENTE: 'bg-amber-50 text-amber-700 ring-amber-200',
  APROBADA: 'bg-sky-50 text-sky-700 ring-sky-200',
  APROBADA_PARCIAL: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  RECHAZADA: 'bg-red-50 text-red-700 ring-red-200',
  DESPACHADA_PARCIAL: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  DESPACHADA_TOTAL: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELADA: 'bg-slate-100 text-slate-500 ring-slate-200',
}
// HU-36: estados desde los que se puede despachar (incluido el saldo de una aprobación parcial).
const ESTADOS_DESPACHABLES = ['APROBADA', 'APROBADA_PARCIAL', 'DESPACHADA_PARCIAL']
const LINEA = { material_id: '', cantidad: '' }
// Lo aprobado que aún no se despacha de una línea (redondeado a 2 decimales como en la base).
const pendienteDespacho = (d) => Math.max(0, Math.round((Number(d.cantidad_aprobada) - Number(d.cantidad_despachada)) * 100) / 100)
const VACIO = { proyecto_id: '', actividad_id: '', fecha_requerida: '', observaciones: '' }

export default function SolicitudesMateriales({ pestanas }) {
  const { puede } = useAuth()
  const puedeCrear = puede('solicitudes_materiales.crear')
  const puedeResolver = puede('solicitudes_materiales.resolver')
  const [form, setForm] = useState(VACIO)
  const [lineas, setLineas] = useState([{ ...LINEA }])
  const [actividades, setActividades] = useState([])
  const [error, setError] = useState('')
  const [excesos, setExcesos] = useState([]) // materiales que superan lo presupuestado (CU-08 Alt 1)
  const [confirmaExceso, setConfirmaExceso] = useState(false)
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [aprobando, setAprobando] = useState(null) // { solicitud, cantidades }
  const [despachando, setDespachando] = useState(null) // { solicitud, almacen, trabajador, cantidades }
  const [rechazando, setRechazando] = useState(null) // { solicitud, motivo }
  const [cancelandoSaldo, setCancelandoSaldo] = useState(null) // { solicitud, motivo }
  const [errorAccion, setErrorAccion] = useState('')
  const solicitudes = useRecurso(() => solicitudesMaterialesApi.listar(), [], { mensaje: 'No se pudieron cargar las solicitudes.' })
  const materiales = useRecurso(() => (puedeCrear ? solicitudesMaterialesApi.catalogo() : Promise.resolve([])), [puedeCrear], { mensaje: 'No se pudieron cargar los materiales.' })
  const notificaciones = useRecurso(() => notificacionesApi.listar({ soloNoLeidas: true }), [], { mensaje: 'No se pudieron cargar las notificaciones.' })
  const proyectos = useRecurso(() => proyectosApi.listar(), [], { mensaje: 'No se pudieron cargar los proyectos.' })
  const almacenes = useRecurso(() => (puedeResolver ? herramientasApi.almacenes() : Promise.resolve([])), [puedeResolver], { mensaje: 'No se pudieron cargar los almacenes.' })
  const trabajadores = useRecurso(() => (puedeResolver ? trabajadoresApi.listar() : Promise.resolve([])), [puedeResolver], { mensaje: 'No se pudieron cargar los trabajadores.' })
  // HU-26: existencia por almacén, para ver cuánto hay en el almacén de origen antes de despachar.
  const existencias = useRecurso(() => (puedeResolver && puede('salidas_materiales.listar') ? salidasMaterialesApi.existencias() : Promise.resolve([])), [puedeResolver], { mensaje: 'No se pudo cargar la existencia por almacén.' })

  useEffect(() => {
    if (!form.proyecto_id) { setActividades([]); return }
    actividadesApi.listar({ proyecto_id: form.proyecto_id }).then(setActividades).catch(() => setActividades([]))
  }, [form.proyecto_id])

  const cambiarLinea = (i, campo) => (e) => { setLineas(lineas.map((l, j) => (j === i ? { ...l, [campo]: e.target.value } : l))); setError(''); setExcesos([]); setConfirmaExceso(false) }
  const marcarLeida = (n) => notificaciones.ejecutar(() => notificacionesApi.marcarLeida(n.id), { error: 'No se pudo marcar la notificación.' })

  const enviar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setAviso('')
    try {
      const { solicitud } = await solicitudesMaterialesApi.crear({
        ...form, observaciones: form.observaciones.trim(), detalles: lineas, confirmar_exceso: confirmaExceso,
      })
      setAviso(`Solicitud ${solicitud.codigo} registrada${solicitud.excede_presupuesto ? ' (excede lo presupuestado)' : ''}: bodega fue notificada.`)
      setForm(VACIO)
      setLineas([{ ...LINEA }])
      setExcesos([])
      setConfirmaExceso(false)
      await solicitudes.recargar()
    } catch (err) {
      const data = err?.response?.data
      if (data?.codigo === 'EXCEDE_PRESUPUESTO') {
        // CU-08 Alt 1: se alerta y se exige confirmar (con justificación) antes de continuar.
        setExcesos(data.excesos ?? [])
        setConfirmaExceso(false)
        setError('')
      } else {
        setError(mensajeError(err, 'No se pudo registrar la solicitud.'))
      }
    } finally {
      setGuardando(false)
    }
  }

  const accion = (fn, s, texto) =>
    solicitudes.ejecutar(() => fn(s.id), { exito: `${texto} ${s.codigo}.`, error: 'No se pudo completar la acción.' })

  const confirmar = async (fn, cerrar) => {
    try {
      await fn()
      cerrar()
      setErrorAccion('')
      await Promise.all([solicitudes.recargar(), existencias.recargar()])
    } catch (err) {
      setErrorAccion(mensajeError(err, 'No se pudo completar la acción.'))
    }
  }

  const abrirAprobar = (s) => {
    setErrorAccion('')
    // Por defecto se propone aprobar lo solicitado, sin pasar de la existencia; lo demás queda como saldo.
    setAprobando({
      solicitud: s,
      cantidades: Object.fromEntries(s.detalles.map((d) => [d.id, String(Math.min(Number(d.cantidad_solicitada), Number(d.existencia_total)))])),
      observaciones: {},
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={solicitudes.recargar} />} title="Solicitudes" subtitle="Solicitudes de materiales al inventario" />
      {pestanas}
      {solicitudes.error && <AlertaFormulario mensaje={solicitudes.error} />}
      {solicitudes.aviso && <AlertaFormulario tipo="aviso" mensaje={solicitudes.aviso} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}
      {materiales.error && <AlertaFormulario mensaje={materiales.error} />}

      {(notificaciones.datos ?? []).length > 0 && (
        <section aria-label="Notificaciones" className="card space-y-2 border-l-4 border-l-brand-500 p-4">
          {notificaciones.datos.map((n) => (
            <div key={n.id} className="flex flex-wrap items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-slate-800">{n.titulo}</p>
                <p className="text-xs text-slate-600">{n.mensaje}</p>
              </div>
              <button type="button" className="btn-ghost text-xs" onClick={() => marcarLeida(n)}>Marcar como leída</button>
            </div>
          ))}
        </section>
      )}

      {puedeCrear && (
        <form className="card grid gap-4 p-5 sm:grid-cols-2" onSubmit={enviar}>
          <div>
            <label htmlFor="sm-proyecto" className="label">Proyecto</label>
            <select id="sm-proyecto" className="input" value={form.proyecto_id} required
              onChange={(e) => { setForm({ ...form, proyecto_id: e.target.value, actividad_id: '' }); setError('') }}>
              <option value="">Seleccione…</option>
              {(proyectos.datos ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sm-actividad" className="label">Actividad</label>
            <select id="sm-actividad" className="input" value={form.actividad_id} required disabled={!form.proyecto_id}
              onChange={(e) => { setForm({ ...form, actividad_id: e.target.value }); setError('') }}>
              <option value="">{form.proyecto_id ? 'Seleccione…' : 'Elija primero el proyecto'}</option>
              {actividades.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sm-fecha" className="label">Fecha requerida (opcional)</label>
            <input id="sm-fecha" type="date" className="input" value={form.fecha_requerida} onChange={(e) => setForm({ ...form, fecha_requerida: e.target.value })} />
          </div>
          <div>
            <label htmlFor="sm-obs" className="label">Observaciones</label>
            <input id="sm-obs" className="input" maxLength={500} required={excesos.length > 0} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <p className="label">Materiales</p>
            {lineas.map((l, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[3fr_1fr_auto]">
                <select aria-label="Material" className="input" value={l.material_id} onChange={cambiarLinea(i, 'material_id')} required>
                  <option value="">Seleccione…</option>
                  {(materiales.datos ?? []).map((m) => <option key={m.id} value={m.id}>{m.codigo} · {m.descripcion}</option>)}
                </select>
                <input aria-label="Cantidad" type="number" min="0.01" step="0.01" placeholder="Cantidad" className="input" value={l.cantidad} onChange={cambiarLinea(i, 'cantidad')} required />
                <button type="button" className="btn-ghost" aria-label="Quitar línea" disabled={lineas.length === 1} onClick={() => setLineas(lineas.filter((_, j) => j !== i))}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost text-xs" onClick={() => setLineas([...lineas, { ...LINEA }])}>
              <PlusIcon className="h-4 w-4" /> Agregar material
            </button>
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-600 sm:col-span-2">{error}</p>}
          {excesos.length > 0 && (
            <div role="alert" className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 sm:col-span-2">
              <p className="font-semibold">Alerta: la cantidad solicitada supera lo presupuestado para la actividad.</p>
              <ul className="list-disc pl-5 text-xs">
                {excesos.map((x) => (
                  <li key={x.material_id}>{x.material}: presupuestado {x.presupuestado}, ya solicitado {x.ya_solicitado}, ahora solicita {x.solicitado}</li>
                ))}
              </ul>
              <label className="flex items-start gap-2 text-xs font-medium">
                <input type="checkbox" className="mt-0.5" checked={confirmaExceso} onChange={(e) => setConfirmaExceso(e.target.checked)} />
                <span>Confirmo que necesito esta cantidad adicional. Justifíquela en Observaciones; bodega lo verá al revisar.</span>
              </label>
            </div>
          )}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary disabled:opacity-60" disabled={guardando || (excesos.length > 0 && !confirmaExceso)}>{guardando ? 'Enviando…' : 'Solicitar materiales'}</button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        {solicitudes.datos === null ? (
          <p className="card flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : solicitudes.datos.length === 0 ? (
          <p className="card px-5 py-6 text-sm text-slate-500">No hay solicitudes de materiales.</p>
        ) : solicitudes.datos.map((s) => (
          <article key={s.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-800">{s.codigo} · {s.proyecto}{s.actividad ? ` · ${s.actividad}` : ''}</h2>
              <span className={`badge ring-1 ${ESTADOS[s.estado] ?? ''}`}>{s.estado.replace('_', ' ')}{s.estado === 'DESPACHADA_TOTAL' && s.saldo_cancelado ? ' · saldo cancelado' : ''}</span>
              {Boolean(s.excede_presupuesto) && <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">Excede lo presupuestado</span>}
              <span className="text-xs text-slate-500">{s.solicitante} · {fmtFecha(s.fecha_solicitud)}</span>
            </div>
            {s.observaciones && <p className="mt-1 text-xs text-slate-500">{s.observaciones}</p>}
            {Boolean(s.saldo_cancelado) && <p className="mt-1 text-xs text-slate-500">Saldo cancelado por bodega: {s.saldo_cancelado_observacion}</p>}
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {s.detalles.map((d) => (
                <li key={d.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                  <span>
                    {d.material_codigo} · {d.material}
                    {d.observacion_aprobacion && <span className="block text-xs text-slate-500">Observación de bodega: {d.observacion_aprobacion}</span>}
                  </span>
                  <span className="tabular-nums text-slate-600">
                    solicitado {d.cantidad_solicitada} · aprobado {d.cantidad_aprobada} · despachado {d.cantidad_despachada}
                    {s.estado !== 'PENDIENTE' && s.estado !== 'RECHAZADA' && (
                      <strong className={d.saldo_pendiente > 0 ? 'text-amber-700' : 'text-slate-500'}> · saldo pendiente {d.saldo_pendiente}</strong>
                    )}
                    {' '}{d.unidad_medida}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {puedeResolver && s.estado === 'PENDIENTE' && (
                <>
                  <button type="button" className="btn-primary text-xs" onClick={() => abrirAprobar(s)}>Aprobar</button>
                  <button type="button" className="btn-ghost text-xs" onClick={() => { setErrorAccion(''); setRechazando({ solicitud: s, motivo: '' }) }}>Rechazar</button>
                </>
              )}
              {puedeResolver && ESTADOS_DESPACHABLES.includes(s.estado) && (
                <button type="button" className="btn-primary text-xs" onClick={() => { setErrorAccion(''); setDespachando({ solicitud: s, almacen: '', trabajador: '', cantidades: Object.fromEntries(s.detalles.map((d) => [d.id, String(pendienteDespacho(d))])) }) }}>
                  {s.estado === 'DESPACHADA_PARCIAL' || s.detalles.some((d) => d.saldo_pendiente > pendienteDespacho(d)) ? 'Despachar (incluye el saldo)' : 'Despachar'}
                </button>
              )}
              {puedeResolver && ESTADOS_DESPACHABLES.includes(s.estado) && s.detalles.some((d) => d.saldo_pendiente > 0) && (
                <button type="button" className="btn-ghost text-xs" onClick={() => { setErrorAccion(''); setCancelandoSaldo({ solicitud: s, motivo: '' }) }}>Cancelar saldo</button>
              )}
              {(s.estado === 'PENDIENTE' || s.estado === 'APROBADA' || s.estado === 'APROBADA_PARCIAL') && (
                <button type="button" className="btn-ghost text-xs" onClick={() => accion(solicitudesMaterialesApi.cancelar, s, 'Cancelada')}>Cancelar</button>
              )}
            </div>
          </article>
        ))}
      </section>

      <Modal abierto={aprobando !== null} titulo="Aprobar solicitud" onCerrar={() => setAprobando(null)} ancho="max-w-md">
        {aprobando && (
          <>
            <p className="mb-3 text-xs text-slate-500">Ajuste lo que aprueba según el stock real: no puede superar lo solicitado ni la existencia. Lo que no apruebe queda como saldo pendiente y se avisa al solicitante. Una línea en cero exige observación.</p>
            {aprobando.solicitud.detalles.map((d) => {
              const tope = Math.min(Number(d.cantidad_solicitada), Number(d.existencia_total))
              const valor = aprobando.cantidades[d.id]
              const saldo = Math.round((Number(d.cantidad_solicitada) - Number(valor || 0)) * 100) / 100
              return (
                <div key={d.id} className="mb-3">
                  <label htmlFor={`ap-${d.id}`} className="label">{d.material} (solicitado {d.cantidad_solicitada}, existencia {d.existencia_total} {d.unidad_medida})</label>
                  <input id={`ap-${d.id}`} type="number" min="0" max={tope} step="0.01" className="input" value={valor}
                    onChange={(e) => setAprobando({ ...aprobando, cantidades: { ...aprobando.cantidades, [d.id]: e.target.value } })} />
                  {saldo > 0 && <p className="mt-1 text-xs text-amber-700">Saldo pendiente: {saldo} {d.unidad_medida}</p>}
                  {Number(valor) === 0 && (
                    <input aria-label={`Observación de ${d.material}`} placeholder="Observación (obligatoria si aprueba cero)" maxLength={500} className="input mt-2"
                      value={aprobando.observaciones[d.id] ?? ''}
                      onChange={(e) => setAprobando({ ...aprobando, observaciones: { ...aprobando.observaciones, [d.id]: e.target.value } })} />
                  )}
                </div>
              )
            })}
            {errorAccion && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errorAccion}</p>}
            <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
              <button type="button" className="btn-primary" onClick={() => confirmar(
                () => solicitudesMaterialesApi.aprobar(aprobando.solicitud.id, {
                  detalles: aprobando.solicitud.detalles.map((d) => ({
                    detalle_id: d.id, cantidad_aprobada: Number(aprobando.cantidades[d.id]), observacion: (aprobando.observaciones[d.id] ?? '').trim() || undefined,
                  })),
                }), () => setAprobando(null))}>Aprobar</button>
              <button type="button" className="btn-ghost" onClick={() => setAprobando(null)}>Cancelar</button>
            </div>
          </>
        )}
      </Modal>

      <Modal abierto={rechazando !== null} titulo="Rechazar solicitud" onCerrar={() => setRechazando(null)} ancho="max-w-md">
        {rechazando && (
          <>
            <label htmlFor="sm-motivo" className="label">Observación (obligatoria)</label>
            <textarea id="sm-motivo" className="input" rows={3} maxLength={500} value={rechazando.motivo} onChange={(e) => setRechazando({ ...rechazando, motivo: e.target.value })} />
            {errorAccion && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errorAccion}</p>}
            <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
              <button type="button" className="btn-primary" onClick={() => confirmar(
                () => solicitudesMaterialesApi.rechazar(rechazando.solicitud.id, rechazando.motivo.trim()), () => setRechazando(null))}>Rechazar</button>
              <button type="button" className="btn-ghost" onClick={() => setRechazando(null)}>Cancelar</button>
            </div>
          </>
        )}
      </Modal>

      {/* HU-36: cancelar el saldo pendiente con una observación obligatoria. */}
      <Modal abierto={cancelandoSaldo !== null} titulo="Cancelar el saldo pendiente" onCerrar={() => setCancelandoSaldo(null)} ancho="max-w-md">
        {cancelandoSaldo && (
          <>
            <p className="mb-3 text-xs text-slate-500">La solicitud se cierra con lo despachado y se avisa al solicitante. Saldo que se cancela:</p>
            <ul className="mb-3 list-disc pl-5 text-sm text-slate-700">
              {cancelandoSaldo.solicitud.detalles.filter((d) => d.saldo_pendiente > 0).map((d) => (
                <li key={d.id}>{d.material}: {d.saldo_pendiente} {d.unidad_medida}</li>
              ))}
            </ul>
            <label htmlFor="cs-motivo" className="label">Observación (obligatoria)</label>
            <textarea id="cs-motivo" className="input" rows={3} maxLength={500} value={cancelandoSaldo.motivo}
              onChange={(e) => setCancelandoSaldo({ ...cancelandoSaldo, motivo: e.target.value })} />
            {errorAccion && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errorAccion}</p>}
            <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
              <button type="button" className="btn-primary" onClick={() => confirmar(
                () => solicitudesMaterialesApi.cancelarSaldo(cancelandoSaldo.solicitud.id, cancelandoSaldo.motivo.trim()), () => setCancelandoSaldo(null))}>Cancelar saldo</button>
              <button type="button" className="btn-ghost" onClick={() => setCancelandoSaldo(null)}>Volver</button>
            </div>
          </>
        )}
      </Modal>

      <Modal abierto={despachando !== null} titulo="Despachar materiales" onCerrar={() => setDespachando(null)} ancho="max-w-md">
        {despachando && (
          <>
            <p className="mb-3 text-xs text-slate-500">Indique cuánto despachar de cada material: por defecto lo aprobado que falta, y puede llegar hasta el saldo pendiente si ya hay existencia. La solicitud se cierra al llegar el saldo a cero.</p>
            {despachando.solicitud.detalles.filter((d) => d.saldo_pendiente > 0).map((d) => (
              <div key={d.id} className="mb-3">
                <label htmlFor={`dp-${d.id}`} className="label">
                  {d.material} (aprobado pendiente {pendienteDespacho(d)}, saldo pendiente {d.saldo_pendiente}, existencia total {d.existencia_total} {d.unidad_medida}
                  {despachando.almacen
                    ? `, en el almacén elegido ${(existencias.datos ?? []).find((x) => String(x.almacen_id) === String(despachando.almacen) && x.material_id === d.material_id)?.existencia ?? 0}`
                    : ', elija el almacén para ver la suya'})
                </label>
                <input id={`dp-${d.id}`} type="number" min="0" max={d.saldo_pendiente} step="0.01" className="input" value={despachando.cantidades[d.id] ?? ''}
                  onChange={(e) => setDespachando({ ...despachando, cantidades: { ...despachando.cantidades, [d.id]: e.target.value } })} />
              </div>
            ))}
            <label htmlFor="dp-almacen" className="label">Almacén de origen</label>
            <select id="dp-almacen" className="input" value={despachando.almacen} onChange={(e) => setDespachando({ ...despachando, almacen: e.target.value })}>
              <option value="">Seleccione…</option>
              {(almacenes.datos ?? []).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
            <label htmlFor="dp-trabajador" className="label mt-4">Entregado a</label>
            <select id="dp-trabajador" className="input" value={despachando.trabajador} onChange={(e) => setDespachando({ ...despachando, trabajador: e.target.value })}>
              <option value="">Seleccione…</option>
              {(trabajadores.datos ?? []).map((t) => <option key={t.id} value={t.id}>{t.nombres} {t.apellidos}</option>)}
            </select>
            {errorAccion && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{errorAccion}</p>}
            <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
              <button type="button" className="btn-primary" onClick={() => confirmar(
                () => solicitudesMaterialesApi.despachar(despachando.solicitud.id, {
                  almacen_origen_id: despachando.almacen, entregado_a_trabajador_id: despachando.trabajador,
                  detalles: despachando.solicitud.detalles.filter((d) => d.saldo_pendiente > 0)
                    .map((d) => ({ detalle_id: d.id, cantidad: Number(despachando.cantidades[d.id] || 0) })),
                }), () => setDespachando(null))}>Despachar</button>
              <button type="button" className="btn-ghost" onClick={() => setDespachando(null)}>Cancelar</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
