import { useEffect, useState } from 'react'
import { ArrowPathIcon, PencilSquareIcon, StarIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { proveedoresApi } from '../services/proveedores'
import { fmtCOP, fmtFecha } from '../lib/format.js'
import { campoError, mensajeError } from '../lib/errores'

/**
 * HU-41 · desempeño del proveedor.
 *
 * Muestra el promedio histórico por criterio y el número de calificaciones, con
 * el historial y el formulario para calificar un servicio finalizado o una
 * entrega recibida. Una corrección se guarda sin eliminar la calificación y
 * queda en la bitácora de trazabilidad.
 */

const PUNTAJES = [5, 4, 3, 2, 1]

const Estrellas = ({ valor }) => (
  <span className="inline-flex items-center gap-0.5 text-amber-500" title={`${valor} de 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <StarIcon
        key={n}
        className={`h-3.5 w-3.5 ${n <= valor ? 'fill-amber-400' : 'text-slate-200'}`}
      />
    ))}
  </span>
)

const VACIO = { clave: '', puntualidad: '5', calidad: '5', comentario: '', fecha_cumplimiento: '' }

export default function CalificacionesProveedor({ proveedor, onCerrar, alCambiar }) {
  const { puede } = useAuth()
  const puedeCalificar = puede('proveedores.calificar')
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [form, setForm] = useState(VACIO)
  const [corrigiendo, setCorrigiendo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [campo, setCampo] = useState(null)

  const cargar = () => {
    setError('')
    return proveedoresApi
      .calificaciones(proveedor.id)
      .then(setDatos)
      .catch((e) => setError(mensajeError(e, 'No se pudieron cargar las calificaciones.')))
  }

  useEffect(() => {
    cargar()
  }, [proveedor.id])

  const cambiar = (nombre, valor) => {
    setCampo(null)
    setForm((f) => ({ ...f, [nombre]: valor }))
  }

  const abrirCorreccion = (calificacion) => {
    setCorrigiendo(calificacion)
    setForm({
      clave: '',
      puntualidad: String(calificacion.puntualidad),
      calidad: String(calificacion.calidad),
      comentario: calificacion.comentario ?? '',
      fecha_cumplimiento: '',
    })
    setAviso('')
    setError('')
  }

  const cancelarCorreccion = () => {
    setCorrigiendo(null)
    setForm(VACIO)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setCampo(null)
    setGuardando(true)
    try {
      if (corrigiendo) {
        await proveedoresApi.corregirCalificacion(proveedor.id, corrigiendo.id, {
          puntualidad: Number(form.puntualidad),
          calidad: Number(form.calidad),
          comentario: form.comentario,
        })
        setAviso('Calificación corregida; la corrección quedó en la bitácora.')
        cancelarCorreccion()
      } else {
        const [tipo, id] = form.clave.split(':')
        await proveedoresApi.calificar(proveedor.id, {
          ...(tipo === 'SERVICIO' ? { servicio_externo_id: Number(id) } : { orden_compra_id: Number(id) }),
          puntualidad: Number(form.puntualidad),
          calidad: Number(form.calidad),
          comentario: form.comentario,
          fecha_cumplimiento: form.fecha_cumplimiento || undefined,
        })
        setAviso('Calificación registrada; el promedio del proveedor ya se actualizó.')
        setForm(VACIO)
      }
      await cargar()
      alCambiar?.()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la calificación.'))
      setCampo(campoError(err))
    } finally {
      setGuardando(false)
    }
  }

  const calificables = datos?.calificables ?? []
  const historial = datos?.calificaciones ?? []

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Desempeño de ${proveedor.razon_social}`}
      subtitulo="Puntualidad y calidad de los servicios y entregas contratadas"
      ancho="max-w-3xl"
    >
      <div className="space-y-5">
        {error && <AlertaFormulario mensaje={error} />}
        {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

        {!datos && !error && (
          <p className="flex items-center gap-3 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando calificaciones…
          </p>
        )}

        {datos && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Puntualidad</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">
                  {datos.promedio.puntualidad === null ? '—' : datos.promedio.puntualidad}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Calidad</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">
                  {datos.promedio.calidad === null ? '—' : datos.promedio.calidad}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Calificaciones</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">{datos.promedio.total}</p>
              </div>
            </div>

            {puedeCalificar && (
              <form onSubmit={guardar} className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  {corrigiendo ? 'Corregir calificación' : 'Calificar un servicio o entrega'}
                </h3>

                {corrigiendo ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Corrige «{corrigiendo.referencia}». No se borra nada: el cambio queda en la bitácora.
                  </p>
                ) : calificables.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No hay servicios finalizados ni entregas recibidas pendientes de calificar.
                  </p>
                ) : (
                  <div className="mt-3">
                    <label htmlFor="cal-referencia" className="label">Servicio o entrega</label>
                    <select
                      id="cal-referencia"
                      className={campo === 'servicio_externo_id' || campo === 'orden_compra_id' ? 'input border-red-400' : 'input'}
                      value={form.clave}
                      required
                      onChange={(e) => cambiar('clave', e.target.value)}
                    >
                      <option value="">Seleccione qué va a calificar…</option>
                      {calificables.map((c) => (
                        <option key={`${c.tipo}-${c.id}`} value={`${c.tipo}:${c.id}`}>
                          {c.tipo === 'SERVICIO' ? 'Servicio' : 'Orden'} · {c.descripcion} ·{' '}
                          {fmtFecha(c.fecha_pactada)} · {fmtCOP(c.valor)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(!corrigiendo ? calificables.length > 0 : true) && (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="cal-puntualidad" className="label">Puntualidad (1 a 5)</label>
                        <select
                          id="cal-puntualidad"
                          className={campo === 'puntualidad' ? 'input border-red-400' : 'input'}
                          value={form.puntualidad}
                          onChange={(e) => cambiar('puntualidad', e.target.value)}
                        >
                          {PUNTAJES.map((n) => <option key={n} value={n}>{n} · {n === 5 ? 'Excelente' : n === 1 ? 'Deficiente' : ''}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="cal-calidad" className="label">Calidad (1 a 5)</label>
                        <select
                          id="cal-calidad"
                          className={campo === 'calidad' ? 'input border-red-400' : 'input'}
                          value={form.calidad}
                          onChange={(e) => cambiar('calidad', e.target.value)}
                        >
                          {PUNTAJES.map((n) => <option key={n} value={n}>{n} · {n === 5 ? 'Excelente' : n === 1 ? 'Deficiente' : ''}</option>)}
                        </select>
                      </div>
                    </div>

                    {!corrigiendo && (
                      <div className="mt-3">
                        <label htmlFor="cal-fecha" className="label">Fecha real de cumplimiento</label>
                        <input
                          id="cal-fecha"
                          type="date"
                          className={campo === 'fecha_cumplimiento' ? 'input border-red-400' : 'input'}
                          value={form.fecha_cumplimiento}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => cambiar('fecha_cumplimiento', e.target.value)}
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          Se compara con la fecha pactada para interpretar la puntualidad.
                        </p>
                      </div>
                    )}

                    <div className="mt-3">
                      <label htmlFor="cal-comentario" className="label">
                        Comentario {(Number(form.puntualidad) <= 2 || Number(form.calidad) <= 2) && '(obligatorio con puntaje de 2 o menos)'}
                      </label>
                      <textarea
                        id="cal-comentario"
                        rows={2}
                        maxLength={500}
                        className={campo === 'comentario' ? 'input border-red-400' : 'input'}
                        value={form.comentario}
                        placeholder={
                          Number(form.puntualidad) <= 2 || Number(form.calidad) <= 2
                            ? 'Explique el motivo del puntaje bajo'
                            : 'Opcional'
                        }
                        onChange={(e) => cambiar('comentario', e.target.value)}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="submit" className="btn-primary" disabled={guardando}>
                        {guardando ? 'Guardando…' : corrigiendo ? 'Guardar corrección' : 'Registrar calificación'}
                      </button>
                      {corrigiendo && (
                        <button type="button" className="btn-ghost" disabled={guardando} onClick={cancelarCorreccion}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </form>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Historial</h3>
              {historial.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500">
                  Este proveedor todavía no tiene calificaciones.
                </p>
              ) : (
                <ul className="space-y-2">
                  {historial.map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-200 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {c.tipo === 'SERVICIO' ? 'Servicio' : 'Orden de compra'} · {c.referencia}
                        </p>
                        <span className="text-[11px] text-slate-400">{fmtFecha(c.calificado_en)}</span>
                      </div>
                      <div className="mt-1 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                        <span className="flex items-center gap-1.5">Puntualidad <Estrellas valor={c.puntualidad} /></span>
                        <span className="flex items-center gap-1.5">Calidad <Estrellas valor={c.calidad} /></span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Pactada {fmtFecha(c.fecha_pactada)} · cumplida {fmtFecha(c.fecha_cumplimiento)}
                        {' · '}calificó {c.calificado_por}
                        {c.actualizado_en ? ` · corregida ${fmtFecha(c.actualizado_en)}` : ''}
                      </p>
                      {c.comentario && <p className="mt-1 text-xs text-slate-700">{c.comentario}</p>}
                      {puedeCalificar && (
                        <button
                          type="button"
                          className="btn-accion btn-accion-editar mt-2"
                          onClick={() => abrirCorreccion(c)}
                        >
                          <PencilSquareIcon className="h-4 w-4" /> Corregir
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
