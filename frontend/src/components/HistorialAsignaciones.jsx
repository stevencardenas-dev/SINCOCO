import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { Interruptor } from './FiltrosControles.jsx'
import { historialAsignacionesApi } from '../services/asignaciones'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-06 · historial de asignaciones de un trabajador.
 *
 * Consulta de solo lectura: proyectos en los que ha participado, rol, fechas
 * programadas y reales, y estado de cada asignación, de la más antigua a la más
 * reciente. Los proyectos dados de baja solo aparecen cuando se activa el
 * interruptor. El botón de descarga genera el documento con los filtros
 * aplicados y la fecha de generación.
 */
const TITULO_ESTADO = {
  ACTIVO: 'Activo',
  FINALIZADO: 'Finalizado',
  REASIGNADO: 'Reasignado',
  CANCELADO: 'Cancelado',
}

const CLASE_ESTADO = {
  ACTIVO: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  FINALIZADO: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  REASIGNADO: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  CANCELADO: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
}

const dia = (valor) => (valor ? fmtFecha(String(valor).slice(0, 10)) : '—')

export default function HistorialAsignaciones({ trabajador, onCerrar }) {
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!trabajador) return
    let vigente = true
    setCargando(true)
    setError('')
    historialAsignacionesApi
      .deTrabajador(trabajador.id, { incluir_inactivos: incluirInactivos })
      .then((r) => vigente && setDatos(r))
      .catch(() => vigente && setError('No se pudo cargar el historial. Intente de nuevo.'))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [trabajador?.id, incluirInactivos])

  if (!trabajador) return null

  const asignaciones = datos?.asignaciones ?? []

  const descargar = async () => {
    try {
      const res = await historialAsignacionesApi.documento(trabajador.id, {
        incluir_inactivos: incluirInactivos,
      })
      const nombre =
        /filename="([^"]+)"/.exec(res.headers?.['content-disposition'] ?? '')?.[1] ??
        'historial-asignaciones.html'
      const url = URL.createObjectURL(res.data)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombre
      enlace.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el documento del historial.')
    }
  }

  return (
    <Modal
      abierto
      titulo="Historial de asignaciones"
      subtitulo={`${trabajador.nombres} ${trabajador.apellidos}`}
      onCerrar={onCerrar}
      ancho="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Interruptor checked={incluirInactivos} onChange={setIncluirInactivos}>
            Incluir proyectos dados de baja
          </Interruptor>
          <button type="button" className="btn-ghost" onClick={descargar} disabled={cargando || !datos}>
            Descargar documento
          </button>
        </div>

        <p className="text-sm text-slate-600">
          {cargando
            ? 'Cargando historial…'
            : `${asignaciones.length} ${asignaciones.length === 1 ? 'asignación registrada' : 'asignaciones registradas'}${
                incluirInactivos ? ', con proyectos dados de baja' : ''
              }`}
        </p>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        {!cargando && asignaciones.length === 0 && !error && (
          <p className="rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            {incluirInactivos
              ? 'El trabajador no tiene asignaciones registradas.'
              : 'Sin asignaciones activas ni históricas. Active el interruptor para incluir proyectos dados de baja.'}
          </p>
        )}

        {asignaciones.length > 0 && (
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Proyecto</th>
                  <th className="px-3 py-2 font-semibold">Actividad</th>
                  <th className="px-3 py-2 font-semibold">Rol</th>
                  <th className="px-3 py-2 font-semibold">Inicio</th>
                  <th className="px-3 py-2 font-semibold">Fin programado</th>
                  <th className="px-3 py-2 font-semibold">Fin real</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asignaciones.map((a) => (
                  <tr key={a.id} className="align-top">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {a.proyecto_nombre}
                      {a.proyecto_activo === 0 && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          Dado de baja
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{a.actividad_nombre ?? 'Todo el proyecto'}</td>
                    <td className="px-3 py-2 text-slate-600">{a.rol_en_proyecto ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{dia(a.fecha_inicio)}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{dia(a.fecha_fin_programada)}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{dia(a.fecha_fin_real)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          CLASE_ESTADO[a.estado] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {TITULO_ESTADO[a.estado] ?? a.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
