import { useCallback, useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import SelectBuscable from './SelectBuscable.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { consumosMaterialesApi } from '../services/consumosMateriales'
import { mensajeError } from '../lib/errores'
import { fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * HU-20 (CU-20): consumo real de materiales de una actividad, dentro del plan del proyecto.
 * Se registra lo consumido de lo despachado a la actividad (sin superarlo); un consumo erróneo se anula
 * solicitándolo y solo un administrador lo autoriza.
 */
const ESTADOS = {
  REGISTRADO: { texto: 'Registrado', clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  ANULACION_SOLICITADA: { texto: 'Anulación solicitada', clase: 'bg-amber-50 text-amber-700 ring-amber-200' },
  ANULADO: { texto: 'Anulado', clase: 'bg-slate-100 text-slate-500 ring-slate-200' },
}
const TITULOS = { solicitar: 'Solicitar anulación', autorizar: 'Autorizar anulación', rechazar: 'Rechazar anulación' }
const VACIO = { material_id: '', cantidad: '', observaciones: '' }

export default function ConsumoMaterialesActividad({ actividad, onCerrar }) {
  const { puede } = useAuth()
  const puedeCrear = puede('consumos_materiales.crear')
  const puedeAutorizar = puede('consumos_materiales.autorizar_anulacion')
  const [consumos, setConsumos] = useState(null)
  const [disponibles, setDisponibles] = useState([])
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [accion, setAccion] = useState(null) // { tipo, consumo, texto }
  const [errorAccion, setErrorAccion] = useState('')

  const cargar = useCallback(async () => {
    try {
      const [todos, disp] = await Promise.all([
        consumosMaterialesApi.listar(),
        puedeCrear ? consumosMaterialesApi.disponibles(actividad.id) : Promise.resolve([]),
      ])
      setConsumos(todos.filter((c) => c.actividad_id === actividad.id))
      setDisponibles(disp)
    } catch (err) {
      setConsumos((c) => c ?? [])
      setError(mensajeError(err, 'No se pudieron cargar los consumos.'))
    }
  }, [actividad.id, puedeCrear])

  useEffect(() => { cargar() }, [cargar])

  const materialElegido = disponibles.find((m) => String(m.material_id) === form.material_id)
  const cambiar = (campo) => (e) => { setForm({ ...form, [campo]: e.target.value }); setError('') }

  const enviar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setAviso('')
    try {
      const { consumo } = await consumosMaterialesApi.registrar({ ...form, actividad_id: actividad.id, observaciones: form.observaciones.trim() })
      setAviso(`Consumo ${consumo.comprobante} registrado: ${Number(consumo.cantidad)} ${consumo.unidad_medida} de ${consumo.material} por ${fmtCOP(consumo.costo_total)}.`)
      setForm(VACIO)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el consumo.'))
    } finally {
      setGuardando(false)
    }
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
      setAviso(tipo === 'solicitar' ? `Anulación de ${consumo.comprobante} solicitada: pendiente de un administrador.`
        : tipo === 'autorizar' ? `Consumo ${consumo.comprobante} anulado: su costo ya no cuenta.`
          : `Anulación de ${consumo.comprobante} rechazada.`)
      await cargar()
    } catch (err) {
      setErrorAccion(mensajeError(err, 'No se pudo completar la acción.'))
    }
  }

  const total = (consumos ?? []).filter((c) => c.estado !== 'ANULADO').reduce((s, c) => s + Number(c.costo_total), 0)

  return (
    <Modal abierto titulo="Consumo de materiales" subtitulo={actividad.nombre} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-4">
        {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

        {puedeCrear && !accion && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={enviar}>
            <div className="sm:col-span-2">
              <label htmlFor="cma-material" className="label">Material despachado a la actividad</label>
              <SelectBuscable id="cma-material" className="input" value={form.material_id} onChange={cambiar('material_id')} required disabled={disponibles.length === 0}>
                <option value="">{disponibles.length ? 'Seleccione…' : 'A esta actividad no se le ha despachado material'}</option>
                {disponibles.map((m) => (
                  <option key={m.material_id} value={m.material_id}>{`${m.material_codigo} · ${m.material} (disponible ${m.disponible} ${m.unidad_medida})`}</option>
                ))}
              </SelectBuscable>
            </div>
            <div>
              <label htmlFor="cma-cantidad" className="label">Cantidad consumida</label>
              <input id="cma-cantidad" type="number" min="0.01" step="0.01" className="input" value={form.cantidad} onChange={cambiar('cantidad')} required />
            </div>
            <div>
              <label htmlFor="cma-obs" className="label">Observaciones (opcional)</label>
              <input id="cma-obs" className="input" maxLength={500} value={form.observaciones} onChange={cambiar('observaciones')} />
            </div>
            {materialElegido && (
              <p className="text-xs text-slate-500 sm:col-span-2">
                Despachado {materialElegido.despachado} · devuelto {materialElegido.devuelto} · ya consumido {materialElegido.consumido} · costo {fmtCOP(materialElegido.costo_unitario)} c/u
              </p>
            )}
            {error && <p role="alert" className="text-xs font-medium text-red-600 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary disabled:opacity-60" disabled={guardando || disponibles.length === 0}>{guardando ? 'Registrando…' : 'Registrar consumo'}</button>
            </div>
          </form>
        )}
        {!puedeCrear && error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}

        {accion ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">{TITULOS[accion.tipo]}</h3>
            <p className="text-sm text-slate-600">{accion.consumo.comprobante} · {accion.consumo.material}: {fmtCOP(accion.consumo.costo_total)}</p>
            <label htmlFor="cma-accion" className="label">
              {accion.tipo === 'solicitar' ? 'Motivo de la anulación (obligatorio)'
                : accion.tipo === 'rechazar' ? 'Observación (obligatoria)'
                  : accion.consumo.estado === 'REGISTRADO' ? 'Motivo (obligatorio)' : 'Observación (opcional)'}
            </label>
            <textarea id="cma-accion" className="input" rows={3} maxLength={500} value={accion.texto}
              onChange={(e) => { setAccion({ ...accion, texto: e.target.value }); setErrorAccion('') }} />
            {errorAccion && <p role="alert" className="text-xs font-medium text-red-600">{errorAccion}</p>}
            <div className="flex gap-3">
              <button type="button" className="btn-primary" onClick={confirmarAccion}>Confirmar</button>
              <button type="button" className="btn-ghost" onClick={() => setAccion(null)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <section aria-label="Consumos registrados">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Consumos registrados
              {consumos?.length > 0 && <span className="ml-2 font-normal text-slate-500">Costo total {fmtCOP(total)}</span>}
            </h3>
            {consumos === null ? (
              <p className="text-sm text-slate-500">Cargando…</p>
            ) : consumos.length === 0 ? (
              <p className="text-sm text-slate-500">Esta actividad aún no tiene consumos registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                {consumos.map((c) => (
                  <li key={c.id} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">{c.comprobante}</span>
                      <span className={`badge ring-1 ${ESTADOS[c.estado]?.clase ?? ''}`}>{ESTADOS[c.estado]?.texto ?? c.estado}</span>
                      <span className="text-xs text-slate-500">{c.registrado_por} · {fmtFecha(c.fecha_consumo)}</span>
                    </div>
                    <p className="text-slate-700">
                      {c.material_codigo} · {c.material}: {Number(c.cantidad)} {c.unidad_medida} × {fmtCOP(c.costo_unitario)} = <strong>{fmtCOP(c.costo_total)}</strong>
                    </p>
                    {c.observaciones && <p className="text-xs text-slate-500">{c.observaciones}</p>}
                    {c.anulacion_motivo && <p className="text-xs text-amber-700">Motivo de la anulación: {c.anulacion_motivo}</p>}
                    {c.anulacion_observacion && (
                      <p className="text-xs text-slate-500">Resolución del administrador{c.anulacion_resuelta_por ? ` (${c.anulacion_resuelta_por})` : ''}: {c.anulacion_observacion}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {c.estado === 'REGISTRADO' && puedeCrear && (
                        <button type="button" className="btn-ghost text-xs" onClick={() => { setErrorAccion(''); setAccion({ tipo: 'solicitar', consumo: c, texto: '' }) }}>Solicitar anulación</button>
                      )}
                      {c.estado === 'REGISTRADO' && puedeAutorizar && (
                        <button type="button" className="btn-ghost text-xs" onClick={() => { setErrorAccion(''); setAccion({ tipo: 'autorizar', consumo: c, texto: '' }) }}>Anular</button>
                      )}
                      {c.estado === 'ANULACION_SOLICITADA' && puedeAutorizar && (
                        <>
                          <button type="button" className="btn-primary text-xs" onClick={() => { setErrorAccion(''); setAccion({ tipo: 'autorizar', consumo: c, texto: '' }) }}>Autorizar anulación</button>
                          <button type="button" className="btn-ghost text-xs" onClick={() => { setErrorAccion(''); setAccion({ tipo: 'rechazar', consumo: c, texto: '' }) }}>Rechazar</button>
                        </>
                      )}
                      {c.estado === 'ANULACION_SOLICITADA' && !puedeAutorizar && (
                        <span className="text-xs text-amber-700">Pendiente de la autorización de un administrador.</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="border-t border-slate-100 pt-4">
          <button type="button" className="btn-ghost" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </Modal>
  )
}
