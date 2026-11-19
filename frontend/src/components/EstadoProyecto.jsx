import { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { proyectosApi } from '../services/proyectos'

/**
 * HU-38 · cambio de estado del proyecto.
 *
 * Ofrece solo las transiciones válidas desde el estado actual y exige motivo en
 * todas. Finalizar es irreversible: si el avance no llega a 100%, la API pide
 * confirmación explícita y aquí se muestra la casilla.
 */
const TITULO = {
  congelar: 'Congelar proyecto',
  reanudar: 'Reanudar proyecto',
  finalizar: 'Finalizar proyecto',
}

const AYUDA = {
  congelar:
    'Mientras esté congelado no se podrán crear asignaciones, solicitudes, salidas, préstamos, servicios ni consumos.',
  reanudar: 'El proyecto vuelve a admitir operaciones nuevas.',
  finalizar:
    'Finalizar es irreversible: cierra las asignaciones vigentes y hace el corte final de costos.',
}

export default function EstadoProyecto({ proyecto, onCerrar, onCambiado }) {
  const acciones = useMemo(() => {
    if (!proyecto) return []
    if (proyecto.estado === 'EN_EJECUCION') return ['congelar', 'finalizar']
    if (proyecto.estado === 'PAUSADO') return ['reanudar', 'finalizar']
    return []
  }, [proyecto?.estado])

  const [accion, setAccion] = useState(acciones[0] ?? '')
  const [motivo, setMotivo] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!proyecto) return null

  if (acciones.length === 0) {
    return (
      <Modal abierto titulo="Estado del proyecto" subtitulo={proyecto.nombre} onCerrar={onCerrar}>
        <p className="text-sm text-slate-600">
          Desde <strong>{proyecto.estado}</strong> no hay cambios de estado disponibles.
        </p>
      </Modal>
    )
  }

  const enviar = async (evento) => {
    evento.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await proyectosApi[accion](proyecto.id, { motivo, confirmar })
      onCambiado?.(
        accion === 'congelar'
          ? `${proyecto.nombre}: proyecto congelado.`
          : accion === 'reanudar'
            ? `${proyecto.nombre}: proyecto reanudado.`
            : `${proyecto.nombre}: proyecto finalizado.`,
      )
    } catch (err) {
      const data = err?.response?.data
      if (data?.codigo === 'CONFIRMACION_REQUERIDA') {
        setConfirmar(false)
        setError(`${data.error}`)
      } else {
        setError(data?.error ?? 'No se pudo cambiar el estado del proyecto.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo={TITULO[accion]}
      subtitulo={`${proyecto.codigo} · ${proyecto.nombre}`}
      onCerrar={onCerrar}
    >
      <form className="space-y-4" onSubmit={enviar}>
        {acciones.length > 1 && (
          <fieldset className="min-w-0">
            <legend className="label">Acción</legend>
            <div className="flex flex-wrap gap-1.5">
              {acciones.map((a) => (
                <label
                  key={a}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 has-[:checked]:border-accent-500 has-[:checked]:bg-accent-400 has-[:checked]:font-semibold has-[:checked]:text-brand-950"
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="accion-estado"
                    value={a}
                    checked={accion === a}
                    onChange={() => {
                      setAccion(a)
                      setError('')
                      setConfirmar(false)
                    }}
                  />
                  {TITULO[a]}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <p className="text-xs text-slate-500">{AYUDA[accion]}</p>

        <div>
          <label htmlFor="motivo-estado" className="label">
            Motivo (obligatorio)
          </label>
          <textarea
            id="motivo-estado"
            className="input"
            rows={3}
            required
            minLength={5}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        {accion === 'finalizar' && (
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              checked={confirmar}
              onChange={(e) => setConfirmar(e.target.checked)}
            />
            <span>
              Confirmo finalizar aunque el avance no llegue al 100%
              <span className="block text-xs text-slate-500">
                El proyecto queda en solo consulta y no se puede reabrir.
              </span>
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={enviando || motivo.trim().length < 5}>
            {enviando ? 'Guardando…' : TITULO[accion]}
          </button>
        </div>
      </form>
    </Modal>
  )
}
