import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import { herramientasApi } from '../services/herramientas'
import { fmtFecha, fmtFechaHora } from '../lib/format.js'
import { mensajeError } from '../lib/errores'

/**
 * HU-27 · historial de una herramienta.
 *
 * Línea de tiempo con cada préstamo, devolución y cambio de estado operativo
 * (envío y salida de reparación), más un resumen de uso que ayuda a decidir si
 * la herramienta necesita mantenimiento. Si nunca se movió, se dice con
 * claridad en vez de mostrar una lista vacía sin explicación.
 */

const TIPO = {
  PRESTAMO: {
    label: 'Préstamo',
    icono: ArrowPathIcon,
    clase: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  DEVOLUCION: {
    label: 'Devolución',
    icono: ArrowUturnLeftIcon,
    clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  REPARACION: {
    label: 'En reparación',
    icono: WrenchScrewdriverIcon,
    clase: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  SALIDA_REPARACION: {
    label: 'Salida de reparación',
    icono: WrenchScrewdriverIcon,
    clase: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
}

const dato = (etiqueta, valor) => (
  <div className="rounded-lg bg-slate-50 px-3 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{etiqueta}</p>
    <p className="text-sm font-medium text-slate-800">{valor}</p>
  </div>
)

export default function HistorialHerramienta({ herramienta, onCerrar }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    setDatos(null)
    setError('')
    herramientasApi
      .historial(herramienta.id)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(mensajeError(e, 'No se pudo cargar el historial de la herramienta.')))
    return () => {
      vigente = false
    }
  }, [herramienta.id])

  return (
    <Modal
      abierto
      lateral
      onCerrar={onCerrar}
      titulo={herramienta.nombre}
      subtitulo={`${herramienta.codigo_serial} · Historial de movimientos`}
    >
      {error && <AlertaFormulario mensaje={error} />}

      {!datos && !error && (
        <p className="flex items-center gap-3 py-8 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando historial…
        </p>
      )}

      {datos && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {dato('Préstamos', datos.resumen.total_prestamos)}
            {dato('Vigentes', datos.resumen.prestamos_vigentes)}
            {dato('Reparaciones', datos.resumen.total_reparaciones)}
            {dato(
              'Días fuera (prom.)',
              datos.resumen.dias_promedio_uso === null ? '—' : datos.resumen.dias_promedio_uso,
            )}
          </div>

          <p className="text-xs text-slate-500">
            {datos.resumen.trabajador_frecuente
              ? `Quien más la ha usado es ${datos.resumen.trabajador_frecuente.nombre} (${datos.resumen.trabajador_frecuente.prestamos} préstamo(s)).`
              : 'La herramienta todavía no registra préstamos.'}
          </p>

          {datos.sin_movimientos ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
              <ClipboardDocumentListIcon className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No hay información disponible</p>
              <p className="text-xs text-slate-500">
                Esta herramienta no registra préstamos ni cambios de estado.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-3 border-l border-slate-200 pl-5">
              {datos.movimientos.map((m, i) => {
                const tipo = TIPO[m.tipo] ?? { label: m.tipo, icono: ClipboardDocumentListIcon, clase: 'bg-slate-100 text-slate-600 ring-slate-200' }
                const Icono = tipo.icono
                return (
                  <li key={`${m.tipo}-${m.prestamo_id ?? m.reparacion_id}-${i}`} className="relative">
                    <span className="absolute -left-[1.72rem] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                      <Icono className="h-3.5 w-3.5 text-slate-600" />
                    </span>
                    <div className="rounded-xl border border-slate-200 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`badge ring-1 ${tipo.clase}`}>{tipo.label}</span>
                        <span className="text-[11px] text-slate-400">{fmtFechaHora(m.fecha)}</span>
                      </div>

                      {m.tipo === 'PRESTAMO' && (
                        <p className="mt-2 text-sm text-slate-700">
                          <strong>{m.trabajador}</strong> la recibió en {m.proyecto_codigo} · {m.proyecto}. Estado:{' '}
                          {m.estado_entrega}. Devolución estimada: {fmtFecha(m.fecha_estimada_devolucion)}.
                        </p>
                      )}

                      {m.tipo === 'DEVOLUCION' && (
                        <p className="mt-2 text-sm text-slate-700">
                          <strong>{m.trabajador}</strong> la devolvió en estado {m.estado_devolucion} tras {m.dias_uso} día(s).
                          {m.recibido_por ? ` La recibió ${m.recibido_por}.` : ''}
                        </p>
                      )}

                      {m.tipo === 'REPARACION' && (
                        <p className="mt-2 text-sm text-slate-700">
                          Ingresó a reparación: {m.descripcion}. Estado previo: {m.estado_previo ?? '—'}.
                        </p>
                      )}

                      {m.tipo === 'SALIDA_REPARACION' && (
                        <p className="mt-2 text-sm text-slate-700">
                          Salió de reparación tras {m.dias_en_reparacion} día(s).
                          {m.costo === null ? '' : ` Costo: $ ${Number(m.costo).toLocaleString('es-CO')}.`}
                        </p>
                      )}

                      {m.observaciones && <p className="mt-1 text-xs text-slate-500">{m.observaciones}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </Modal>
  )
}
