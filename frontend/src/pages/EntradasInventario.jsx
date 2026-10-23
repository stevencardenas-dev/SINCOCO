import { useState } from 'react'
import { ArrowPathIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { entradasInventarioApi } from '../services/entradasInventario'
import { materialesApi } from '../services/materiales'
import { proveedoresApi } from '../services/proveedores'
import { herramientasApi } from '../services/herramientas'
import { useRecurso } from '../hooks/useRecurso'
import { fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * HU-19 (CU-19): ingreso de materiales al inventario.
 * La entrada lleva almacén, proveedor, responsable, factura o remisión y costo total;
 * cada línea, cantidad y costo unitario. Si viene de una orden de compra, el backend
 * actualiza lo recibido y el estado de la orden (parcial deja la diferencia pendiente).
 */
const LINEA = { material_id: '', cantidad: '', costo_unitario: '' }
const VACIO = { almacen_id: '', proveedor_id: '', numero_factura_remision: '', orden_compra_id: '', observaciones: '' }

export default function EntradasInventario() {
  const { puede } = useAuth()
  const puedeCrear = puede('entradas_inventario.crear')
  const [form, setForm] = useState(VACIO)
  const [lineas, setLineas] = useState([{ ...LINEA }])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const entradas = useRecurso(() => entradasInventarioApi.listar(), [], { mensaje: 'No se pudieron cargar los ingresos.' })
  const ordenes = useRecurso(() => entradasInventarioApi.ordenes(), [], { mensaje: 'No se pudieron cargar las órdenes de compra.' })
  const materiales = useRecurso(() => materialesApi.listar(), [], { mensaje: 'No se pudieron cargar los materiales.' })
  const proveedores = useRecurso(() => proveedoresApi.listar(), [], { mensaje: 'No se pudieron cargar los proveedores.' })
  const almacenes = useRecurso(() => herramientasApi.almacenes(), [], { mensaje: 'No se pudieron cargar los almacenes.' })

  const cambiar = (campo) => (e) => { setForm({ ...form, [campo]: e.target.value }); setError('') }
  const cambiarLinea = (i, campo) => (e) => {
    setLineas(lineas.map((l, j) => (j === i ? { ...l, [campo]: e.target.value } : l)))
    setError('')
  }

  // Al elegir una orden se toma su proveedor y se precargan las líneas con lo pendiente.
  const elegirOrden = (e) => {
    const orden = (ordenes.datos ?? []).find((o) => String(o.id) === e.target.value)
    setError('')
    if (!orden) return setForm({ ...form, orden_compra_id: '' })
    setForm({ ...form, orden_compra_id: String(orden.id), proveedor_id: String(orden.proveedor_id) })
    setLineas(orden.detalles
      .filter((d) => Number(d.cantidad_pedida) > Number(d.cantidad_recibida))
      .map((d) => ({
        material_id: String(d.material_id),
        cantidad: String(Number(d.cantidad_pedida) - Number(d.cantidad_recibida)),
        costo_unitario: String(d.precio_unitario),
      })))
  }

  const enviar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setAviso('')
    try {
      const { entrada } = await entradasInventarioApi.registrar({
        ...form,
        numero_factura_remision: form.numero_factura_remision.trim(),
        observaciones: form.observaciones.trim(),
        detalles: lineas,
      })
      setAviso(`Ingreso ${entrada.comprobante} registrado por ${fmtCOP(entrada.costo_total)}.`)
      setForm(VACIO)
      setLineas([{ ...LINEA }])
      await Promise.all([entradas.recargar(), ordenes.recargar()])
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo registrar el ingreso.')
    } finally {
      setGuardando(false)
    }
  }

  const selectDe = (id, valor, onChange, opciones, vacio = 'Seleccione…') => (
    <select id={id} className="input" value={valor} onChange={onChange}>
      <option value="">{vacio}</option>
      {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  )

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={entradas.recargar} />} title="Ingreso de materiales" subtitle="Entradas al inventario por almacén y proveedor" />
      {entradas.error && <AlertaFormulario mensaje={entradas.error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {puedeCrear && (
        <form className="card grid gap-4 p-5 sm:grid-cols-2" onSubmit={enviar}>
          <div>
            <label htmlFor="ei-orden" className="label">Orden de compra (opcional)</label>
            {selectDe('ei-orden', form.orden_compra_id, elegirOrden,
              (ordenes.datos ?? []).map((o) => [o.id, `${o.codigo} · ${o.proveedor}`]), 'Sin orden de compra')}
          </div>
          <div>
            <label htmlFor="ei-factura" className="label">Factura o remisión</label>
            <input id="ei-factura" className="input" maxLength={50} value={form.numero_factura_remision} onChange={cambiar('numero_factura_remision')} required />
          </div>
          <div>
            <label htmlFor="ei-almacen" className="label">Almacén</label>
            {selectDe('ei-almacen', form.almacen_id, cambiar('almacen_id'), (almacenes.datos ?? []).map((a) => [a.id, a.nombre]))}
          </div>
          <div>
            <label htmlFor="ei-proveedor" className="label">Proveedor</label>
            {selectDe('ei-proveedor', form.proveedor_id, cambiar('proveedor_id'), (proveedores.datos ?? []).map((p) => [p.id, p.razon_social]))}
          </div>

          <div className="space-y-3 sm:col-span-2">
            <p className="label">Materiales</p>
            {lineas.map((l, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
                {selectDe(`ei-mat-${i}`, l.material_id, cambiarLinea(i, 'material_id'),
                  (materiales.datos ?? []).map((m) => [m.id, `${m.codigo} · ${m.descripcion}`]))}
                <input aria-label="Cantidad" type="number" min="0.01" step="0.01" placeholder="Cantidad" className="input" value={l.cantidad} onChange={cambiarLinea(i, 'cantidad')} required />
                <input aria-label="Costo unitario" type="number" min="0.01" step="0.01" placeholder="Costo unitario" className="input" value={l.costo_unitario} onChange={cambiarLinea(i, 'costo_unitario')} required />
                <button type="button" className="btn-ghost" aria-label="Quitar línea" disabled={lineas.length === 1} onClick={() => setLineas(lineas.filter((_, j) => j !== i))}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost text-xs" onClick={() => setLineas([...lineas, { ...LINEA }])}>
              <PlusIcon className="h-4 w-4" /> Agregar material
            </button>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ei-obs" className="label">Observaciones</label>
            <input id="ei-obs" className="input" maxLength={500} value={form.observaciones} onChange={cambiar('observaciones')} />
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary disabled:opacity-60" disabled={guardando}>
              {guardando ? 'Registrando…' : 'Registrar ingreso'}
            </button>
          </div>
        </form>
      )}

      <section className="card overflow-hidden">
        {entradas.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : entradas.datos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aún no hay ingresos registrados.</p>
        ) : (
          <TablaFicha
            filas={entradas.datos}
            compacta
            minWidth="md:min-w-0"
            ficha={{ titulo: (e) => e.comprobante, subtitulo: (e) => e.proveedor }}
            columnas={[
              { titulo: 'Comprobante', movil: true, celda: (e) => e.comprobante },
              { titulo: 'Proveedor', movil: true, celda: (e) => e.proveedor },
              { titulo: 'Costo total', movil: true, celda: (e) => fmtCOP(e.costo_total) },
              { titulo: 'Almacén', celda: (e) => e.almacen },
              { titulo: 'Factura / remisión', celda: (e) => e.numero_factura_remision },
              { titulo: 'Orden de compra', celda: (e) => e.orden_compra ?? '—' },
              { titulo: 'Responsable', celda: (e) => e.responsable },
              { titulo: 'Fecha', celda: (e) => fmtFecha(e.fecha_entrada), orden: (e) => e.fecha_entrada },
            ]}
          />
        )}
      </section>
    </div>
  )
}
