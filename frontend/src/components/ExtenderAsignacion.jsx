import { useEffect, useState } from 'react'
import ModalFormulario from './ModalFormulario.jsx'
import Modal from './Modal.jsx'
import { asignacionesApi } from '../services/asignaciones'
import { useFormulario } from '../hooks/useFormulario'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-31 · prórroga de una asignación vigente e historial de sus extensiones.
 * Una asignación cerrada solo muestra el historial (no admite extensión).
 * Cada extensión es un evento propio: la fecha fin original nunca se pierde.
 */
const dia = (v) => String(v ?? '').slice(0, 10)
const sumarDia = (iso) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA')
}

export default function ExtenderAsignacion({ asignacion, onCerrar, onExtendida }) {
  const [historial, setHistorial] = useState(null)
  const cargar = () => asignacionesApi.historial(asignacion.id).then(setHistorial).catch(() => setHistorial({ extensiones: [] }))

  const formulario = useFormulario({ fecha_fin_programada: '', motivo: '' }, {
    enviar: (v) => asignacionesApi.extender(asignacion.id, v),
    alGuardar: (r) => {
      setHistorial(r)
      return onExtendida?.(`${asignacion.trabajador_nombre}: asignación extendida hasta ${fmtFecha(dia(r.asignacion.fecha_fin_programada))}.`)
    },
    cerrarAlGuardar: false,
    error: 'No se pudo extender la asignación.',
  })

  useEffect(() => {
    setHistorial(null)
    if (asignacion) cargar()
  }, [asignacion?.id])

  if (!asignacion) return null
  const vigente = dia(historial?.asignacion?.fecha_fin_programada ?? asignacion.fecha_fin_programada)
  const extensiones = historial?.extensiones ?? []
  const puedeExtender = asignacion.estado === 'ACTIVO' && Boolean(vigente)
  const v = formulario.valores

  const cuerpo = (
    <>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="label">Fecha fin original</dt><dd>{historial ? fmtFecha(historial.fecha_fin_original) : '…'}</dd></div>
        <div><dt className="label">Fecha fin vigente</dt><dd>{vigente ? fmtFecha(vigente) : 'Sin fecha fin'}</dd></div>
      </dl>
      <div>
        <p className="label">Extensiones aplicadas</p>
        {extensiones.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no se ha extendido.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            {extensiones.map((e) => (
              <li key={e.id} className="px-3 py-2">
                <p className="font-medium text-slate-800">{fmtFecha(dia(e.fecha_fin_anterior))} → {fmtFecha(dia(e.fecha_fin_nueva))}</p>
                <p className="text-slate-600">{e.motivo}</p>
                <p className="text-xs text-slate-400">{e.usuario ?? 'usuario eliminado'} · {fmtFecha(e.fecha_registro)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {puedeExtender ? (
        <>
          <div>
            <label htmlFor="ext-fecha" className="label">Nueva fecha fin</label>
            <input id="ext-fecha" type="date" className={formulario.claseCampo('fecha_fin_programada')} required
              min={sumarDia(vigente)} value={v.fecha_fin_programada}
              onChange={(e) => formulario.cambiar('fecha_fin_programada', e.target.value)} />
          </div>
          <div>
            <label htmlFor="ext-motivo" className="label">Motivo (obligatorio)</label>
            <textarea id="ext-motivo" rows={2} className={formulario.claseCampo('motivo')} required
              value={v.motivo} onChange={(e) => formulario.cambiar('motivo', e.target.value)} />
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500">
          {asignacion.estado === 'ACTIVO'
            ? 'Esta asignación no tiene fecha fin programada: no hay nada que extender.'
            : 'La asignación está cerrada y no admite extensión: registre una nueva asignación.'}
        </p>
      )}
    </>
  )

  return puedeExtender ? (
    <ModalFormulario {...formulario.propsModal} abierto onCerrar={onCerrar} titulo="Extender asignación"
      subtitulo={`${asignacion.trabajador_nombre} · ${asignacion.actividad_nombre ?? 'Todo el proyecto'}`}
      textoGuardar="Extender" espaciado="space-y-4">
      {cuerpo}
    </ModalFormulario>
  ) : (
    <Modal abierto titulo="Historial de la asignación" subtitulo={asignacion.trabajador_nombre} onCerrar={onCerrar}>
      <div className="space-y-4">{cuerpo}</div>
    </Modal>
  )
}
