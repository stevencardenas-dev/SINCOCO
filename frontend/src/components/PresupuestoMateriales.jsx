import { useEffect, useState } from 'react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import { actividadesApi } from '../services/actividades'
import { mensajeError } from '../lib/errores'

/**
 * HU-08 · cantidades presupuestadas de cada material para una actividad.
 *
 * Contra estas cantidades se valida cada solicitud de materiales (CU-08 Alt 1).
 * No es el presupuesto en COP de la actividad, que se compara con los servicios
 * externos (HU-28). Quien no gestiona el plan las ve en solo lectura.
 */
const LINEA = { material_id: '', cantidad_presupuestada: '' }

export default function PresupuestoMateriales({ actividad, editable, onCerrar, onGuardado }) {
  const [lineas, setLineas] = useState(null)
  const [materiales, setMateriales] = useState([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    actividadesApi.presupuestoMateriales(actividad.id)
      .then((r) => {
        setLineas(r.lineas.map((l) => ({ material_id: String(l.material_id), cantidad_presupuestada: String(Number(l.cantidad_presupuestada)) })))
        setMateriales(r.materiales)
      })
      .catch((err) => setError(mensajeError(err, 'No se pudo cargar el presupuesto de materiales.')))
  }, [actividad.id])

  const cambiar = (i, campo, valor) => setLineas(lineas.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)))
  const material = (id) => materiales.find((m) => String(m.id) === String(id))

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      await actividadesApi.guardarPresupuestoMateriales(actividad.id, lineas.map((l) => ({ ...l, material_id: Number(l.material_id) })))
      onGuardado()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el presupuesto de materiales.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal abierto titulo="Presupuesto de materiales" subtitulo={actividad.nombre} onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={guardar} className="space-y-3">
        <p className="text-xs text-slate-500">
          Si una solicitud supera estas cantidades, el sistema alerta y exige confirmación. Sin materiales en la lista no se
          valida nada; con al menos uno, un material que no esté en la lista cuenta como presupuesto cero.
        </p>
        {lineas === null && !error && <p className="text-sm text-slate-500">Cargando…</p>}
        {lineas?.length === 0 && <p className="text-sm text-slate-500">Esta actividad no tiene presupuesto de materiales.</p>}
        {lineas?.map((l, i) => (
          <div key={i} className="grid items-center gap-3 sm:grid-cols-[3fr_1fr_auto]">
            <select aria-label="Material" className="input" value={l.material_id} disabled={!editable} required
              onChange={(e) => cambiar(i, 'material_id', e.target.value)}>
              <option value="">Seleccione…</option>
              {materiales.filter((m) => String(m.id) === l.material_id || !lineas.some((x) => x.material_id === String(m.id))).map((m) => (
                <option key={m.id} value={m.id}>{m.codigo} · {m.descripcion}</option>
              ))}
            </select>
            <input aria-label={`Cantidad${material(l.material_id) ? ` en ${material(l.material_id).unidad_medida}` : ''}`} type="number" min="0.01" step="0.01"
              placeholder={material(l.material_id)?.unidad_medida ?? 'Cantidad'} className="input" value={l.cantidad_presupuestada} disabled={!editable} required
              onChange={(e) => cambiar(i, 'cantidad_presupuestada', e.target.value)} />
            {editable && (
              <button type="button" className="btn-ghost" aria-label="Quitar material" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}>
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {editable && lineas !== null && (
          <button type="button" className="btn-ghost text-xs" onClick={() => setLineas([...lineas, { ...LINEA }])}>
            <PlusIcon className="h-4 w-4" /> Agregar material
          </button>
        )}
        <AlertaFormulario mensaje={error} />
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          {editable && <button type="submit" className="btn-primary disabled:opacity-60" disabled={guardando || lineas === null}>Guardar</button>}
          <button type="button" className="btn-ghost" onClick={onCerrar}>{editable ? 'Cancelar' : 'Cerrar'}</button>
        </div>
      </form>
    </Modal>
  )
}
