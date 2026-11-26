import { useState } from 'react'
import {
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { actasRecepcionApi } from '../services/actasRecepcion'
import { useRecurso } from '../hooks/useRecurso'
import { fmtFecha, fmtFechaHora } from '../lib/format.js'
import { campoError, mensajeError } from '../lib/errores'

/**
 * HU-40 (CU-26 · acta de recepción): el maestro de obra confirma en obra las
 * cantidades recibidas de una salida de materiales.
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - toda salida genera un acta pendiente;
 *   - solo el destinatario o el maestro responsable del proyecto o de la
 *     actividad pueden firmar, con su propia sesión;
 *   - si la cantidad recibida difiere de la despachada, la observación de esa
 *     línea es obligatoria;
 *   - firmada el acta, no admite cambios y bodega ve la constancia y las alertas.
 */

const ESTADOS = [
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'FIRMADA', etiqueta: 'Firmadas' },
  { valor: '', etiqueta: 'Todas' },
]

export default function ActasRecepcion({ pestanas }) {
  const { puede } = useAuth()
  const puedeFirmar = puede('actas_recepcion.firmar')
  const [estado, setEstado] = useState('PENDIENTE')

  const actas = useRecurso(
    () => actasRecepcionApi.listar({ estado }),
    [estado],
    { mensaje: 'No se pudieron cargar las actas de recepción.' },
  )

  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [cantidades, setCantidades] = useState({})
  const [observaciones, setObservaciones] = useState({})
  const [observacionGeneral, setObservacionGeneral] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [campoForm, setCampoForm] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const abrir = async (acta) => {
    setErrorForm('')
    setCampoForm(null)
    setObservacionGeneral('')
    setCantidades({})
    setObservaciones({})
    setCargandoDetalle(true)
    try {
      const completa = await actasRecepcionApi.obtener(acta.id)
      setDetalle(completa)
      setCantidades(
        Object.fromEntries(
          completa.detalles.map((d) => [d.id, String(d.cantidad_recibida ?? d.cantidad_despachada)]),
        ),
      )
      setObservaciones(
        Object.fromEntries(completa.detalles.map((d) => [d.id, d.observacion ?? ''])),
      )
    } catch (err) {
      // Sin ficha abierta, el error se muestra en la página.
      actas.setError(mensajeError(err, 'No se pudo abrir el acta.'))
    } finally {
      setCargandoDetalle(false)
    }
  }

  const cerrar = () => {
    setDetalle(null)
    setErrorForm('')
    setCampoForm(null)
  }

  const difiere = (linea) => Number(cantidades[linea.id]) !== Number(linea.cantidad_despachada)

  const firmar = async () => {
    setErrorForm('')
    setCampoForm(null)
    const faltante = detalle.detalles.find(
      (l) => difiere(l) && !String(observaciones[l.id] ?? '').trim(),
    )
    if (faltante) {
      setErrorForm(`Explique la diferencia de ${faltante.material}: la observación es obligatoria.`)
      setCampoForm(`observacion_${faltante.id}`)
      return
    }
    setGuardando(true)
    try {
      const res = await actasRecepcionApi.firmar(detalle.id, {
        observaciones: observacionGeneral,
        detalles: detalle.detalles.map((l) => ({
          detalle_id: l.id,
          cantidad_recibida: Number(cantidades[l.id]),
          observacion: observaciones[l.id] ?? null,
        })),
      })
      actas.setAviso(
        res.acta.con_diferencias
          ? 'Acta firmada con diferencias: se generó una alerta para bodega.'
          : 'Acta firmada correctamente.',
      )
      cerrar()
      await actas.recargar()
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo firmar el acta.'))
      setCampoForm(campoError(err))
    } finally {
      setGuardando(false)
    }
  }

  const firmable = detalle?.estado === 'PENDIENTE' && puedeFirmar

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={actas.recargar} />}
        title="Actas de recepción"
        subtitle="Constancia de lo recibido en obra frente a lo despachado por bodega"
      />
      {pestanas}

      <div className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e.etiqueta}
            type="button"
            className={estado === e.valor ? 'btn-primary text-xs' : 'btn-ghost text-xs'}
            onClick={() => setEstado(e.valor)}
          >
            {e.etiqueta}
          </button>
        ))}
      </div>

      {actas.error && <AlertaFormulario mensaje={actas.error} />}
      {actas.aviso && <AlertaFormulario tipo="aviso" mensaje={actas.aviso} />}

      <p className="text-xs text-slate-500">
        El acta nace al despachar una solicitud aprobada (Solicitudes → Materiales). Firmarla deja la
        constancia con su usuario, fecha y hora; después no admite cambios.
      </p>

      <section className="card overflow-hidden">
        {actas.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando actas…
          </p>
        ) : actas.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">
            {estado === 'PENDIENTE'
              ? 'No hay actas pendientes de recepción.'
              : 'No hay actas con ese filtro.'}
          </p>
        ) : (
          <TablaFicha
            filas={actas.datos}
            minWidth="md:min-w-[900px]"
            filaClase={() => 'transition hover:bg-slate-50/70'}
            ficha={{ titulo: (a) => a.comprobante, subtitulo: (a) => a.proyecto }}
            columnas={[
              { titulo: 'Comprobante', movil: true, tdClase: 'font-medium tabular-nums text-slate-800', celda: (a) => a.comprobante },
              { titulo: 'Proyecto', movil: true, tdClase: 'text-slate-700', celda: (a) => a.proyecto },
              { titulo: 'Actividad', tdClase: 'text-slate-600', celda: (a) => a.actividad ?? '—' },
              { titulo: 'Entregado a', tdClase: 'text-slate-600', celda: (a) => a.entregado_a },
              { titulo: 'Despachó', tdClase: 'text-slate-600', celda: (a) => a.despachado_por },
              { titulo: 'Fecha de salida', tdClase: 'text-slate-600', celda: (a) => fmtFecha(a.fecha_salida) },
              {
                titulo: 'Estado',
                movil: true,
                celda: (a) =>
                  a.estado === 'FIRMADA' ? (
                    <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Firmada</span>
                  ) : (
                    <span className="badge bg-amber-50 text-amber-800 ring-1 ring-amber-200">Pendiente</span>
                  ),
              },
              {
                titulo: 'Diferencias',
                celda: (a) =>
                  a.con_diferencias ? (
                    <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                      <ExclamationTriangleIcon className="h-3 w-3" /> Con diferencia
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">{a.pendiente ? 'Por confirmar' : 'Sin diferencia'}</span>
                  ),
              },
              {
                titulo: 'Acciones',
                acciones: true,
                celda: (a, enFicha) => {
                  const boton = (
                    <button
                      className="btn-accion btn-accion-editar"
                      onClick={() => abrir(a)}
                      aria-label={`Revisar el acta ${a.comprobante}`}
                    >
                      {a.pendiente && puedeFirmar ? (
                        <><PencilSquareIcon className="h-4 w-4" /> Revisar y firmar</>
                      ) : (
                        <><ClipboardDocumentCheckIcon className="h-4 w-4" /> Ver acta</>
                      )}
                    </button>
                  )
                  return enFicha ? boton : <div className="-my-1">{boton}</div>
                },
              },
            ]}
          />
        )}
      </section>

      {(detalle || cargandoDetalle) && (
        <Modal
          abierto
          onCerrar={cerrar}
          titulo={detalle ? `Acta de la salida ${detalle.comprobante}` : 'Cargando acta…'}
          subtitulo={detalle ? `${detalle.proyecto} · ${detalle.actividad ?? 'Sin actividad'}` : undefined}
          ancho="max-w-3xl"
        >
          {cargandoDetalle && !detalle ? (
            <p className="flex items-center gap-3 py-6 text-sm text-slate-500">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando acta…
            </p>
          ) : (
            <div className="space-y-4">
              {errorForm && <AlertaFormulario mensaje={errorForm} />}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <dt className="text-slate-500">Entregado a</dt>
                <dd className="text-right text-slate-800">{detalle.entregado_a}</dd>
                <dt className="text-slate-500">Despachó</dt>
                <dd className="text-right text-slate-800">{detalle.despachado_por}</dd>
                <dt className="text-slate-500">Fecha de salida</dt>
                <dd className="text-right text-slate-800">{fmtFechaHora(detalle.fecha_salida)}</dd>
                <dt className="text-slate-500">Estado</dt>
                <dd className="text-right font-semibold text-slate-800">
                  {detalle.estado === 'FIRMADA'
                    ? `Firmada por ${detalle.firmada_por ?? 'usuario'} el ${fmtFechaHora(detalle.firmada_en)}`
                    : 'Pendiente de recepción'}
                </dd>
              </dl>

              <div className="space-y-3">
                {detalle.detalles.map((linea) => {
                  const diferencia = firmable && difiere(linea)
                  const claseObs = campoForm === `observacion_${linea.id}` ? 'input border-red-400' : 'input'
                  return (
                    <div
                      key={linea.id}
                      className={`rounded-xl border px-4 py-3 ${diferencia ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {linea.material_codigo} · {linea.material}
                        </p>
                        <p className="text-xs text-slate-500">
                          Despachado: <strong className="tabular-nums">{linea.cantidad_despachada}</strong>{' '}
                          {linea.unidad_medida}
                        </p>
                      </div>

                      {firmable ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-[9rem_1fr]">
                          <div>
                            <label htmlFor={`cant-${linea.id}`} className="label">Recibido</label>
                            <input
                              id={`cant-${linea.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              className={`input tabular-nums ${campoForm === `cantidad_${linea.id}` ? 'border-red-400' : ''}`}
                              value={cantidades[linea.id] ?? ''}
                              onChange={(e) => setCantidades((c) => ({ ...c, [linea.id]: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label htmlFor={`obs-${linea.id}`} className="label">
                              Observación {diferencia ? '(obligatoria: hay diferencia)' : '(opcional)'}
                            </label>
                            <input
                              id={`obs-${linea.id}`}
                              maxLength={500}
                              className={claseObs}
                              value={observaciones[linea.id] ?? ''}
                              placeholder={diferencia ? 'Explique qué faltó o llegó en mal estado' : 'Sin novedad'}
                              onChange={(e) => setObservaciones((o) => ({ ...o, [linea.id]: e.target.value }))}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-700">
                          Recibido: <strong className="tabular-nums">{linea.cantidad_recibida ?? '—'}</strong>{' '}
                          {linea.unidad_medida}
                          {linea.observacion && <span className="block text-xs text-slate-500">{linea.observacion}</span>}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {firmable ? (
                <>
                  <div>
                    <label htmlFor="acta-obs" className="label">Observación general del acta (opcional)</label>
                    <textarea
                      id="acta-obs"
                      rows={2}
                      className="input"
                      maxLength={1000}
                      value={observacionGeneral}
                      onChange={(e) => setObservacionGeneral(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className="btn-primary" disabled={guardando} onClick={firmar}>
                      <ClipboardDocumentCheckIcon className="h-5 w-5" />
                      {guardando ? 'Firmando…' : 'Firmar acta de recepción'}
                    </button>
                    <button type="button" className="btn-ghost" disabled={guardando} onClick={cerrar}>
                      Cancelar
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    La firma queda con su usuario, la fecha y la hora; después el acta no admite cambios.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  {detalle.estado === 'FIRMADA'
                    ? 'Esta acta ya está firmada y es inmutable; queda a disposición de bodega.'
                    : 'Solo el destinatario de la salida o el maestro responsable del proyecto o de la actividad puede firmar esta acta.'}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
