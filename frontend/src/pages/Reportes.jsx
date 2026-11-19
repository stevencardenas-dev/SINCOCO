import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { reportesApi, descargarBlob } from '../services/reportes'
import { mensajeError } from '../lib/errores'
import { fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * HU-25 · reportes exportables.
 *
 * Filtros por rango de fechas, proyecto y tipo de recurso; la tabla y los
 * totales se recalculan en el servidor. La exportación repite los filtros y la
 * fecha de generación en el encabezado del archivo (CSV o HTML imprimible).
 */
const TIPOS = [
  { valor: 'COSTOS', etiqueta: 'Costo consolidado' },
  { valor: 'MATERIALES', etiqueta: 'Salidas de materiales' },
  { valor: 'SERVICIOS', etiqueta: 'Servicios externos' },
  { valor: 'PERSONAL', etiqueta: 'Personal asignado' },
]

const hoy = () => new Date().toISOString().slice(0, 10)

export default function Reportes() {
  const [filtros, setFiltros] = useState({ tipo: 'COSTOS', desde: '', hasta: '', proyecto_id: '' })
  const [proyectos, setProyectos] = useState([])
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    reportesApi
      .proyectos()
      .then((r) => setProyectos(r.proyectos ?? []))
      .catch(() => setProyectos([]))
  }, [])

  const cargar = () => {
    setCargando(true)
    setError('')
    reportesApi
      .generar(filtros)
      .then(setReporte)
      .catch((err) => {
        setError(mensajeError(err, 'No se pudo generar el reporte.'))
        setReporte(null)
      })
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [filtros.tipo, filtros.desde, filtros.hasta, filtros.proyecto_id])

  const proyectoElegido = useMemo(
    () => proyectos.find((p) => String(p.id) === String(filtros.proyecto_id)),
    [proyectos, filtros.proyecto_id],
  )

  const exportar = async (formato) => {
    setExportando(formato)
    setError('')
    try {
      const { blob, nombre } = await reportesApi.exportar(filtros, formato)
      if (formato === 'html') {
        window.open(URL.createObjectURL(blob), '_blank')
      } else {
        descargarBlob(blob, nombre)
      }
    } catch (err) {
      setError(mensajeError(err, 'No se pudo exportar el reporte.'))
    } finally {
      setExportando('')
    }
  }

  const cambiar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reportes"
        descripcion="Operación por proyecto y periodo, exportable a Excel o documento imprimible"
      />

      <form
        className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault()
          cargar()
        }}
      >
        <div>
          <label htmlFor="rep-tipo" className="label">
            Tipo de recurso
          </label>
          <select id="rep-tipo" className="input" value={filtros.tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rep-desde" className="label">
            Desde
          </label>
          <input
            id="rep-desde"
            type="date"
            className="input"
            max={filtros.hasta || hoy()}
            value={filtros.desde}
            onChange={(e) => cambiar('desde', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="rep-hasta" className="label">
            Hasta
          </label>
          <input
            id="rep-hasta"
            type="date"
            className="input"
            min={filtros.desde || undefined}
            max={hoy()}
            value={filtros.hasta}
            onChange={(e) => cambiar('hasta', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="rep-proyecto" className="label">
            Proyecto
          </label>
          <select
            id="rep-proyecto"
            className="input"
            value={filtros.proyecto_id}
            onChange={(e) => cambiar('proyecto_id', e.target.value)}
          >
            <option value="">Todos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} · {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full justify-center">
            Generar
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      {reporte && (
        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {reporte.filtros.etiquetaTipo}
              </h2>
              <p className="text-xs text-slate-500">
                {reporte.filtros.desde || 'sin fecha inicial'} → {reporte.filtros.hasta || 'sin fecha final'} ·{' '}
                {proyectoElegido ? `${proyectoElegido.codigo} · ${proyectoElegido.nombre}` : 'todos los proyectos'} ·
                generado el {fmtFecha(reporte.generado_en)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => exportar('csv')}
                disabled={exportando !== ''}
              >
                {exportando === 'csv' ? 'Exportando…' : 'Exportar CSV'}
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => exportar('html')}
                disabled={exportando !== ''}
              >
                {exportando === 'html' ? 'Abriendo…' : 'Documento imprimible'}
              </button>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="label">Filas</dt>
              <dd className="font-semibold tabular-nums text-slate-800">{reporte.totales.filas}</dd>
            </div>
            <div>
              <dt className="label">Cantidad</dt>
              <dd className="font-semibold tabular-nums text-slate-800">{reporte.totales.cantidad}</dd>
            </div>
            <div>
              <dt className="label">Monto</dt>
              <dd className="font-semibold tabular-nums text-slate-800">{fmtCOP(reporte.totales.monto)}</dd>
            </div>
          </dl>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  {reporte.columnas.map((c) => (
                    <th key={c.clave} className="px-3 py-2 font-semibold">
                      {c.titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={reporte.columnas.length} className="px-3 py-6 text-center text-slate-500">
                      Generando reporte…
                    </td>
                  </tr>
                ) : reporte.filas.length === 0 ? (
                  <tr>
                    <td colSpan={reporte.columnas.length} className="px-3 py-6 text-center text-slate-500">
                      Sin datos para los filtros elegidos.
                    </td>
                  </tr>
                ) : (
                  reporte.filas.map((f, i) => (
                    <tr key={`${f.fecha}-${f.proyecto_codigo}-${i}`} className="border-b border-slate-100">
                      <td className="px-3 py-2 tabular-nums text-slate-600">{f.fecha}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{f.proyecto_codigo}</td>
                      <td className="px-3 py-2 text-slate-800">{f.proyecto}</td>
                      <td className="px-3 py-2 text-slate-600">{f.detalle}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{f.cantidad}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                        {f.monto === '' || f.monto === null ? '—' : fmtCOP(f.monto)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
