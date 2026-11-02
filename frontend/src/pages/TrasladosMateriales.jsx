import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { trasladosMaterialesApi } from '../services/trasladosMateriales'
import { mensajeError } from '../lib/errores'
import { useRecurso } from '../hooks/useRecurso'
import { fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * HU-29 (CU-29): traslado de materiales entre almacenes.
 * Bodega mueve existencia de un almacén de origen a uno de destino (distintos entre sí) sin pasar por una compra ni
 * por una salida hacia un proyecto. El sistema valida la existencia del origen, reasigna el costo al destino y deja un
 * comprobante consecutivo con el responsable que lo ejecuta.
 */
const VACIO = { almacen_origen_id: '', almacen_destino_id: '', material_id: '', cantidad: '', observaciones: '' }

export default function TrasladosMateriales() {
  const { puede } = useAuth()
  const puedeCrear = puede('traslados_materiales.crear')
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const traslados = useRecurso(() => trasladosMaterialesApi.listar(), [], { mensaje: 'No se pudieron cargar los traslados.' })
  const opciones = useRecurso(() => (puedeCrear ? trasladosMaterialesApi.opciones() : Promise.resolve(null)), [puedeCrear], { mensaje: 'No se pudieron cargar las opciones del formulario.' })

  const cambiar = (campo) => (e) => { setForm({ ...form, [campo]: e.target.value }); setError('') }
  const almacenes = opciones.datos?.almacenes ?? []
  // Solo se ofrece lo que el almacén de origen tiene en existencia, con la cantidad disponible.
  const materiales = (opciones.datos?.existencias ?? []).filter((e) => String(e.almacen_id) === form.almacen_origen_id)
  const elegirOrigen = (e) => { setForm({ ...form, almacen_origen_id: e.target.value, almacen_destino_id: '', material_id: '' }); setError('') }
  const disponible = materiales.find((m) => String(m.material_id) === form.material_id)

  const enviar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setAviso('')
    try {
      const { traslado } = await trasladosMaterialesApi.registrar({ ...form, observaciones: form.observaciones.trim() })
      setAviso(
        `Traslado ${traslado.comprobante} registrado: ${Number(traslado.cantidad)} ${traslado.unidad_medida} de ${traslado.material} pasan de ${traslado.almacen_origen} a ${traslado.almacen_destino}; costo reasignado: ${fmtCOP(traslado.costo_total)}.`,
      )
      setForm(VACIO)
      await traslados.recargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el traslado.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={traslados.recargar} />} title="Traslado de materiales" subtitle="Reubicación de existencias entre almacenes" />
      {traslados.error && <AlertaFormulario mensaje={traslados.error} />}
      {opciones.error && <AlertaFormulario mensaje={opciones.error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {puedeCrear && (
        <form className="card grid gap-4 p-5 sm:grid-cols-2" onSubmit={enviar}>
          <div>
            <label htmlFor="tr-origen" className="label">Almacén de origen</label>
            <select id="tr-origen" className="input" value={form.almacen_origen_id} onChange={elegirOrigen} required>
              <option value="">Seleccione…</option>
              {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tr-destino" className="label">Almacén de destino</label>
            <select id="tr-destino" className="input" value={form.almacen_destino_id} onChange={cambiar('almacen_destino_id')} required>
              <option value="">Seleccione…</option>
              {almacenes.filter((a) => String(a.id) !== form.almacen_origen_id).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tr-material" className="label">Material</label>
            <select id="tr-material" className="input" value={form.material_id} onChange={cambiar('material_id')} disabled={!form.almacen_origen_id} required>
              <option value="">{form.almacen_origen_id ? (materiales.length ? 'Seleccione…' : 'Sin existencias en el origen') : 'Elija primero el origen'}</option>
              {materiales.map((m) => (
                <option key={m.material_id} value={m.material_id}>{m.material_codigo} · {m.material} (disponible {m.existencia} {m.unidad_medida})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tr-cantidad" className="label">Cantidad</label>
            <input id="tr-cantidad" type="number" min="0.01" max={disponible?.existencia} step="0.01" className="input" value={form.cantidad} onChange={cambiar('cantidad')} required />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tr-observaciones" className="label">Observaciones (opcional)</label>
            <textarea id="tr-observaciones" className="input" rows={2} maxLength={500} value={form.observaciones} onChange={cambiar('observaciones')} />
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary disabled:opacity-60" disabled={guardando}>
              {guardando ? 'Registrando…' : 'Registrar traslado'}
            </button>
          </div>
        </form>
      )}

      <section className="card overflow-hidden">
        {traslados.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : traslados.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aún no hay traslados registrados.</p>
        ) : (
          <TablaFicha
            filas={traslados.datos}
            compacta
            minWidth="md:min-w-0"
            ficha={{ titulo: (t) => t.comprobante, subtitulo: (t) => t.material }}
            columnas={[
              { titulo: 'Comprobante', movil: true, celda: (t) => t.comprobante },
              { titulo: 'Material', movil: true, celda: (t) => `${t.material_codigo} · ${t.material}` },
              { titulo: 'Cantidad', movil: true, celda: (t) => `${Number(t.cantidad)} ${t.unidad_medida}` },
              { titulo: 'Origen', movil: true, celda: (t) => t.almacen_origen },
              { titulo: 'Destino', movil: true, celda: (t) => t.almacen_destino },
              { titulo: 'Costo reasignado', celda: (t) => fmtCOP(t.costo_total) },
              { titulo: 'Responsable', celda: (t) => t.responsable },
              { titulo: 'Observaciones', celda: (t) => t.observaciones ?? '—' },
              { titulo: 'Fecha', celda: (t) => fmtFecha(t.fecha_traslado), orden: (t) => t.fecha_traslado },
            ]}
          />
        )}
      </section>
    </div>
  )
}
