import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import { actividadesApi } from '../services/actividades'
import { mensajeError } from '../lib/errores'
import { fmtFechaHora, etiquetaEsfuerzo } from '../lib/format.js'

/**
 * HU-21 · avance de una actividad por criterios de aceptación e historial.
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - el porcentaje de la actividad es equitativo: criterios cumplidos / total;
 *   - cada cambio conserva el porcentaje anterior y el nuevo;
 *   - al cumplir todos los criterios la actividad pasa sola a «Completada»;
 *   - el avance de la etapa y del proyecto es el promedio ponderado por el
 *     esfuerzo de cada actividad; la respuesta trae los valores recalculados.
 * Una actividad que no está en ejecución (pendiente, completada o suspendida)
 * solo muestra sus criterios y el historial.
 */
const ESTADOS_CON_AVANCE = ['EN_PROCESO', 'ATRASADA']
const pct = (n) => `${Number(n ?? 0)} %`

export default function RegistrarAvance({ actividad, onCerrar, onRegistrado }) {
  const [historial, setHistorial] = useState(null)
  const [criterios, setCriterios] = useState(null)
  const [actual, setActual] = useState(Number(actividad?.porcentaje_avance ?? 0))
  const [estado, setEstado] = useState(actividad?.estado)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = () => {
    actividadesApi.historialAvance(actividad.id).then(setHistorial).catch(() => setHistorial([]))
    actividadesApi.criterios(actividad.id).then(setCriterios).catch(() => setCriterios([]))
  }

  useEffect(() => {
    setHistorial(null)
    setCriterios(null)
    setError('')
    setActual(Number(actividad?.porcentaje_avance ?? 0))
    setEstado(actividad?.estado)
    if (actividad) cargar()
  }, [actividad?.id])

  if (!actividad) return null
  const admiteAvance = ESTADOS_CON_AVANCE.includes(estado) && actual < 100

  const marcar = async (criterio, cumplido) => {
    setGuardando(true)
    setError('')
    try {
      const r = await actividadesApi.registrarAvance(actividad.id, { criterio_id: criterio.id, cumplido })
      setActual(r.porcentaje_nuevo)
      if (r.estado) setEstado(r.estado)
      cargar()
      const completada = r.porcentaje_nuevo >= 100 ? ' La actividad quedó completada.' : ''
      onRegistrado?.(
        `${actividad.nombre}: avance de ${pct(r.porcentaje_anterior)} a ${pct(r.porcentaje_nuevo)}. ` +
          `Etapa ${pct(r.avance_etapa)} · proyecto ${pct(r.avance_proyecto)}.${completada}`,
      )
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el avance.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal abierto titulo="Avance de la actividad" subtitulo={actividad.nombre} onCerrar={onCerrar}>
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="label">Avance actual</dt>
            <dd className="font-semibold tabular-nums text-slate-800">{pct(actual)}</dd>
          </div>
          <div>
            <dt className="label">Esfuerzo (peso en la etapa)</dt>
            <dd className="text-slate-700">
              {etiquetaEsfuerzo(actividad.esfuerzo)} · {Number(actividad.peso ?? 3)}
            </dd>
          </div>
        </dl>

        <div>
          <p className="label">Criterios de aceptación</p>
          {criterios === null ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : criterios.length === 0 ? (
            <p className="text-sm text-slate-500">Esta actividad no tiene criterios de aceptación.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              {criterios.map((c) => (
                <li key={c.id} className="px-3 py-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={c.cumplido}
                      disabled={!admiteAvance || guardando}
                      onChange={(e) => marcar(c, e.target.checked)}
                    />
                    <span className={c.cumplido ? 'text-slate-500 line-through' : 'text-slate-800'}>
                      {c.descripcion}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Cada criterio vale lo mismo; al cumplirlos todos la actividad queda completada.
          </p>
          <AlertaFormulario mensaje={error} />
        </div>

        <div>
          <p className="label">Registros anteriores</p>
          {historial === null ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no se ha registrado avance.</p>
          ) : (
            <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 text-sm">
              {historial.map((h) => (
                <li key={h.id} className="px-3 py-2">
                  <p className="font-medium tabular-nums text-slate-800">
                    {pct(h.porcentaje_anterior)} → {pct(h.porcentaje_nuevo)}
                  </p>
                  {h.observaciones && <p className="text-slate-600">{h.observaciones}</p>}
                  <p className="text-xs text-slate-400">
                    {h.registrado_por ?? 'usuario eliminado'} · {fmtFechaHora(h.fecha_registro)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!admiteAvance && (
          <p className="text-xs text-slate-500">
            {estado === 'PENDIENTE'
              ? 'La actividad aún no ha empezado: empiécela antes de registrar avance.'
              : estado === 'SUSPENDIDA'
                ? 'La actividad está suspendida y no admite avance.'
                : 'La actividad ya está completada y no admite más avance.'}
          </p>
        )}
      </div>
    </Modal>
  )
}
