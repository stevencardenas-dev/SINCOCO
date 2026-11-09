import { useState } from 'react'
import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { BotonQuitar } from '../components/BotonesBaja.jsx'
import FiltrosMovimiento, { enRango } from '../components/FiltrosMovimiento.jsx'
import Paginacion from '../components/Paginacion.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { entradasInventarioApi } from '../services/entradasInventario'
import { materialesApi } from '../services/materiales'
import { mensajeError } from '../lib/errores'
import { herramientasApi } from '../services/herramientas'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { usePaginacion } from '../hooks/usePaginacion'
import { coincide } from '../lib/busqueda.js'
import { fmtCOP, fmtFecha } from '../lib/format.js'
import SelectBuscable from '../components/SelectBuscable.jsx'

/**
 * HU-19 (CU-19): ingreso de materiales al inventario.
 * La entrada lleva almacén, proveedor, responsable, factura o remisión y costo total;
 * cada línea, cantidad y costo unitario. Si viene de una orden de compra, el backend
 * actualiza lo recibido y el estado de la orden (parcial deja la diferencia pendiente).
 */
const LINEA = { material_id: '', cantidad: '', costo_unitario: '' }
const FILTROS_VACIOS = { buscar: '', almacen: '', desde: '', hasta: '' }
const VACIO = { almacen_id: '', proveedor_id: '', numero_factura_remision: '', orden_compra_id: '', observaciones: '' }

export default function EntradasInventario({ pestanas }) {
  const { puede } = useAuth()
  const puedeCrear = puede('entradas_inventario.crear')
  const [form, setForm] = useState(VACIO)
  const [lineas, setLineas] = useState([{ ...LINEA }])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const entradas = useRecurso(() => entradasInventarioApi.listar(), [], { mensaje: 'No se pudieron cargar los ingresos.' })
  const ordenes = useRecurso(() => entradasInventarioApi.ordenes(), [], { mensaje: 'No se pudieron cargar las órdenes de compra.' })
  const materiales = useRecurso(() => materialesApi.listar(), [], { mensaje: 'No se pudieron cargar los materiales.' })
  const proveedores = useRecurso(() => entradasInventarioApi.proveedores(), [],{ mensaje: 'No se pudieron cargar los proveedores.' })
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
      setAbierto(false)
      await Promise.all([entradas.recargar(), ordenes.recargar()])
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el ingreso.'))
    } finally {
      setGuardando(false)
    }
  }

  const selectDe = (id, valor, onChange, opciones, vacio = 'Seleccione…') => (
    <SelectBuscable id={id} className="input" value={valor} onChange={onChange}>
      <option value="">{vacio}</option>
      {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </SelectBuscable>
  )

  const controles = useFiltros(FILTROS_VACIOS)
  const { filtros } = controles
  const filtradas = (entradas.datos ?? []).filter((e) =>
    coincide(filtros.buscar, e.comprobante, e.proveedor, e.numero_factura_remision, e.orden_compra, e.responsable,
      ...(e.detalles ?? []).map((d) => `${d.material_codigo} ${d.material}`))
    && (!filtros.almacen || String(e.almacen_id) === filtros.almacen)
    && enRango(e.fecha_entrada, filtros))
  const paginacion = usePaginacion(filtradas, { clave: JSON.stringify(filtros) })

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={entradas.recargar} />} title="Ingreso de materiales" subtitle="Entradas al inventario por almacén y proveedor">
        {puedeCrear && (
          <button type="button" className="btn-primary" onClick={() => { setAviso(''); setError(''); setAbierto(true) }}>
            <PlusIcon className="h-5 w-5" /> Registrar ingreso
          </button>
        )}
      </PageHeader>
      {pestanas}
      {entradas.error && <AlertaFormulario mensaje={entradas.error} />}
      {proveedores.error && <AlertaFormulario mensaje={proveedores.error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      <FiltrosMovimiento id="ei-f" titulo="Buscar ingresos" placeholder="Comprobante, proveedor, factura o material"
        controles={controles} almacenes={(almacenes.datos ?? []).map((a) => [String(a.id), a.nombre])} />

      {puedeCrear && (
        <ModalFormulario abierto={abierto} titulo="Registrar ingreso" subtitulo="Entrada de materiales a un almacén" ancho="max-w-3xl"
          onGuardar={enviar} onCerrar={() => setAbierto(false)} guardando={guardando} error={error}
          textoGuardar="Registrar ingreso" textoGuardando="Registrando…" espaciado="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
                <BotonQuitar etiqueta="Quitar línea" disabled={lineas.length === 1} onClick={() => setLineas(lineas.filter((_, j) => j !== i))} />
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
        </div>
        </ModalFormulario>
      )}

      <section className="card overflow-hidden">
        {entradas.datos === null ? (
          <p className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando…
          </p>
        ) : filtradas.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">{entradas.datos.length === 0 ? 'Aún no hay ingresos registrados.' : 'Ningún ingreso coincide con los filtros.'}</p>
        ) : (
          <>
          <TablaFicha
            filas={paginacion.visibles}
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
              {
                titulo: 'Materiales',
                celda: (e) => (e.detalles ?? []).map((d) => (
                  <span key={d.material_id} className="block">
                    {d.material_codigo} · {d.material}: {Number(d.cantidad)} {d.unidad_medida} × {fmtCOP(d.costo_unitario)} = {fmtCOP(d.costo_subtotal)}
                  </span>
                )),
              },
              { titulo: 'Fecha', celda: (e) => fmtFecha(e.fecha_entrada), orden: (e) => e.fecha_entrada },
            ]}
          />
          <Paginacion paginacion={paginacion} />
          </>
        )}
      </section>
    </div>
  )
}
