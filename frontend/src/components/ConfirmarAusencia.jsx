import Modal from './Modal.jsx'
import { fmtFecha } from '../lib/format.js'

const ETIQUETA = { VACACIONES: 'vacaciones', LICENCIA: 'licencia' }

/**
 * Confirmación al pasar a vacaciones o licencia a quien tiene asignaciones o
 * actividades vigentes. No se bloquea el cambio: se muestra a qué proyectos y
 * actividades afecta, que siguen asignadas sin modificarse (mismo criterio que
 * el aviso de asignaciones fuera de fechas de la reprogramación).
 */
export default function ConfirmarAusencia({ pendiente, enviando, onConfirmar, onCancelar }) {
  const { trabajador, estado, compromisos = [] } = pendiente ?? {}
  return (
    <Modal abierto={Boolean(pendiente)} titulo={`Pasar a ${ETIQUETA[estado] ?? ''}`}
      subtitulo={trabajador ? `${trabajador.nombres} ${trabajador.apellidos}` : ''} onCerrar={onCancelar}>
      <p className="text-sm text-slate-600">
        Tiene {compromisos.length} {compromisos.length === 1 ? 'compromiso vigente' : 'compromisos vigentes'}.
        Seguirá asignado y no aparecerá como disponible mientras esté de {ETIQUETA[estado]}.
        Sus asignaciones no se modifican: revíselas si necesita reasignar el trabajo.
      </p>
      <ul className="mt-3 max-h-60 space-y-1.5 overflow-y-auto text-xs text-slate-700">
        {compromisos.map((c, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="font-semibold">{c.codigo} · {c.proyecto}</span>
            {c.actividad ? ` · ${c.actividad}` : ' · todo el proyecto'}
            <span className="block text-slate-500">
              {fmtFecha(c.desde)} — {c.hasta ? fmtFecha(c.hasta) : 'sin fin'}
              {c.tipo === 'ACTIVIDAD' ? ' · responsable de la actividad' : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="btn-primary" disabled={enviando} onClick={onConfirmar}>
          {enviando ? 'Guardando…' : 'Confirmar cambio'}
        </button>
      </div>
    </Modal>
  )
}
