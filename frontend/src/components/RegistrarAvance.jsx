import { useEffect, useState } from 'react'
import ModalFormulario from './ModalFormulario.jsx'
import Modal from './Modal.jsx'
import { actividadesApi } from '../services/actividades'
import { useFormulario } from '../hooks/useFormulario'
import { fmtFechaHora } from '../lib/format.js'

/**
 * HU-21 · registro del porcentaje de avance de una actividad e historial.
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - el porcentaje va de 0 a 100 (hasta 2 decimales) y no puede bajar del
 *     último registrado;
 *   - cada registro conserva el porcentaje anterior y el nuevo;
 *   - al llegar a 100 % la actividad pasa sola a «Completada»;
 *   - el avance de la etapa y del proyecto es el promedio ponderado por el peso
 *     de cada actividad; la respuesta trae los valores recalculados.
 * Una actividad que no está en ejecución (pendiente, completada o suspendida)
 * solo muestra el historial.
 */
const ESTADOS_CON_AVANCE = ['EN_PROCESO', 'ATRASADA']
const pct = (n) => `${Number(n ?? 0)} %`

export default function RegistrarAvance({ actividad, onCerrar, onRegistrado }) {
  const [historial, setHistorial] = useState(null)
  const [actual, setActual] = useState(Number(actividad?.porcentaje_avance ?? 0))
  const cargar = () =>
    actividadesApi.historialAvance(actividad.id).then(setHistorial).catch(() => setHistorial([]))

  const formulario = useFormulario({ porcentaje: '', observaciones: '' }, {
    enviar: (v) =>
      actividadesApi.registrarAvance(actividad.id, {
        porcentaje: v.porcentaje === '' ? '' : Number(v.porcentaje),
        observaciones: v.observaciones,
      }),
    alGuardar: (r) => {
      const completada = r.porcentaje_nuevo >= 100 ? ' La actividad quedó completada.' : ''
      return onRegistrado?.(
        `${actividad.nombre}: avance de ${pct(r.porcentaje_anterior)} a ${pct(r.porcentaje_nuevo)}. ` +
          `Etapa ${pct(r.avance_etapa)} · proyecto ${pct(r.avance_proyecto)}.${completada}`,
      )
    },
    error: 'No se pudo registrar el avance.',
  })

  useEffect(() => {
    setHistorial(null)
    setActual(Number(actividad?.porcentaje_avance ?? 0))
    if (actividad) cargar()
  }, [actividad?.id])

  if (!actividad) return null
  const admiteAvance = ESTADOS_CON_AVANCE.includes(actividad.estado) && actual < 100
  const v = formulario.valores
  const nuevo = v.porcentaje === '' ? null : Number(v.porcentaje)
  const aviso100 = nuevo !== null && nuevo >= 100

  const cuerpo = (
    <>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="label">Avance actual</dt>
          <dd className="font-semibold tabular-nums text-slate-800">{pct(actual)}</dd>
        </div>
        <div>
          <dt className="label">Peso en la etapa</dt>
          <dd className="tabular-nums text-slate-700">{Number(actividad.peso ?? 1)}</dd>
        </div>
      </dl>

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

      {admiteAvance ? (
        <>
          <div>
            <label htmlFor="av-porcentaje" className="label">
              Nuevo porcentaje de avance
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={actual}
                max="100"
                step="1"
                aria-label="Deslizador del porcentaje de avance"
                className="h-2 flex-1 cursor-pointer accent-brand-600"
                value={v.porcentaje === '' ? actual : v.porcentaje}
                onChange={(e) => formulario.cambiar('porcentaje', e.target.value)}
              />
              <input
                id="av-porcentaje"
                type="number"
                min={actual}
                max="100"
                step="0.01"
                inputMode="decimal"
                required
                className={`${formulario.claseCampo('porcentaje')} w-28 tabular-nums`}
                value={v.porcentaje}
                onChange={(e) => formulario.cambiar('porcentaje', e.target.value)}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Entre {actual} y 100. El avance no puede retroceder.
            </p>
            {aviso100 && (
              <p className="mt-2 rounded-xl bg-accent-50 px-3 py-2 text-xs text-brand-800 ring-1 ring-accent-200">
                Al llegar a 100 % la actividad se marca como completada.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="av-obs" className="label">
              Observaciones (opcional)
            </label>
            <textarea
              id="av-obs"
              rows={2}
              maxLength={1000}
              className={formulario.claseCampo('observaciones')}
              value={v.observaciones}
              onChange={(e) => formulario.cambiar('observaciones', e.target.value)}
            />
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500">
          {actividad.estado === 'PENDIENTE'
            ? 'La actividad aún no ha empezado: empiécela antes de registrar avance.'
            : actividad.estado === 'SUSPENDIDA'
              ? 'La actividad está suspendida y no admite avance.'
              : 'La actividad ya está completada y no admite más avance.'}
        </p>
      )}
    </>
  )

  return admiteAvance ? (
    <ModalFormulario
      {...formulario.propsModal}
      abierto
      onCerrar={onCerrar}
      titulo="Registrar avance"
      subtitulo={actividad.nombre}
      textoGuardar="Registrar avance"
      espaciado="space-y-4"
    >
      {cuerpo}
    </ModalFormulario>
  ) : (
    <Modal abierto titulo="Avance de la actividad" subtitulo={actividad.nombre} onCerrar={onCerrar}>
      <div className="space-y-4">{cuerpo}</div>
    </Modal>
  )
}
