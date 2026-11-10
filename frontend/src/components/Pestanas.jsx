/**
 * Pestañas de un módulo: conmutador en pastilla con icono y una pastilla oscura deslizante que marca la sección activa.
 * Es el mismo patrón del plan del proyecto, compartido por Herramientas, Solicitudes, Movimientos, etc.
 * `tabs`: [{ id, label, icono?, cuenta?, ayuda? }]; `cuenta` muestra un contador junto al nombre.
 */
export default function Pestanas({ tabs, activo, onCambiar, etiqueta = 'Secciones' }) {
  const indice = Math.max(0, tabs.findIndex((t) => t.id === activo))
  return (
    <div role="tablist" aria-label={etiqueta}
      className="relative grid w-full rounded-2xl bg-slate-100 p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      <span aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-xl bg-brand-900 shadow-md transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${tabs.length})`, transform: `translateX(${indice * 100}%)` }} />
      {tabs.map((t) => {
        const activa = t.id === activo
        const Icono = t.icono
        return (
          <button key={t.id} type="button" role="tab" aria-selected={activa} onClick={() => onCambiar(t.id)}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              activa ? 'text-white' : 'text-slate-500 hover:text-brand-800'
            }`}>
            {Icono && <Icono className={`h-5 w-5 ${activa ? 'text-accent-400' : ''}`} />}
            {t.label}
            {t.cuenta != null && (
              <span title={t.ayuda} aria-label={t.ayuda} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activa ? 'bg-accent-400 text-brand-950' : 'bg-white text-slate-600'}`}>
                {t.cuenta}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
