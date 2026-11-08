/**
 * Controles para el panel de FiltrosDesplegable. Todos son campos nativos
 * (radio, casilla), así que el panel los lee solo para armar las etiquetas de
 * «filtros aplicados» y funcionan con teclado (flechas en el grupo, espacio en el interruptor).
 */

// Título de grupo dentro del panel.
export function SeccionFiltros({ titulo, icono: Icono, children }) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-1.5 border-b border-slate-100 pb-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">
        {Icono && <Icono className="h-3.5 w-3.5 text-accent-500" />}
        {titulo}
      </h3>
      {children}
    </section>
  )
}

/**
 * Opciones cortas como botones de un clic en lugar de un desplegable.
 * `opciones` incluye la opción «todos» con value ''. La elegida se pinta de amarillo.
 */
export function Segmentado({ etiqueta, nombre, opciones, value, onChange }) {
  return (
    <fieldset data-filtro={etiqueta} className="min-w-0">
      <legend className="label">{etiqueta}</legend>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 has-[:checked]:border-accent-500 has-[:checked]:bg-accent-400 has-[:checked]:font-semibold has-[:checked]:text-brand-950 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-400"
          >
            <input
              type="radio"
              className="sr-only"
              name={nombre}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Casilla con aspecto de interruptor.
export function Interruptor({ children, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-accent-500 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-400 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
      {children}
    </label>
  )
}
