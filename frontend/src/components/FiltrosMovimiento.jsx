import FiltrosDesplegable from './FiltrosDesplegable.jsx'

/**
 * Filtros comunes de los movimientos de inventario: búsqueda de texto, almacén y rango de fechas.
 * `almacenes` es una lista de [valor, texto]; `children` agrega filtros propios de cada movimiento.
 * Se usa con `useFiltros({ buscar, almacen, desde, hasta, ... })`.
 */
export default function FiltrosMovimiento({ id, titulo, placeholder, controles, almacenes = [], children }) {
  const { filtros, cambiar, limpiar, activos } = controles
  return (
    <FiltrosDesplegable titulo={titulo} ariaLabel={titulo} activos={activos}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor={`${id}-buscar`} className="label">Búsqueda</label>
          <input id={`${id}-buscar`} type="search" className="input" placeholder={placeholder}
            value={filtros.buscar} onChange={(e) => cambiar('buscar', e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-almacen`} className="label">Almacén</label>
          <select id={`${id}-almacen`} className="input" value={filtros.almacen} onChange={(e) => cambiar('almacen', e.target.value)}>
            <option value="">Todos</option>
            {almacenes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-desde`} className="label">Desde</label>
          <input id={`${id}-desde`} type="date" className="input" value={filtros.desde} max={filtros.hasta || undefined}
            onChange={(e) => cambiar('desde', e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-hasta`} className="label">Hasta</label>
          <input id={`${id}-hasta`} type="date" className="input" value={filtros.hasta} min={filtros.desde || undefined}
            onChange={(e) => cambiar('hasta', e.target.value)} />
        </div>
        {children}
      </div>
    </FiltrosDesplegable>
  )
}

/** ¿La fecha (YYYY-MM-DD…) cae dentro del rango de los filtros `desde`/`hasta`? */
export const enRango = (fecha, { desde, hasta }) => {
  const dia = String(fecha ?? '').slice(0, 10)
  return (!desde || dia >= desde) && (!hasta || dia <= hasta)
}
