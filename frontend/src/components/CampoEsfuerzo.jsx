import { ESFUERZOS } from '../lib/format.js'

/**
 * Selector del esfuerzo de una actividad: cinco niveles con un indicador de
 * barras (más barras = más esfuerzo) y un color que sube de verde a rojo.
 * Reemplaza al `<select>` para que el nivel se lea de un vistazo.
 */
const NIVELES = {
  MUY_BAJO: { barras: 1, activo: 'border-emerald-300 bg-emerald-50 text-emerald-800', barra: 'bg-emerald-500' },
  BAJO: { barras: 2, activo: 'border-lime-300 bg-lime-50 text-lime-800', barra: 'bg-lime-500' },
  MEDIO: { barras: 3, activo: 'border-amber-300 bg-amber-50 text-amber-800', barra: 'bg-amber-500' },
  ALTO: { barras: 4, activo: 'border-orange-300 bg-orange-50 text-orange-800', barra: 'bg-orange-500' },
  MUY_ALTO: { barras: 5, activo: 'border-red-300 bg-red-50 text-red-800', barra: 'bg-red-500' },
}

/** Orden de menor a mayor esfuerzo, que es como se lee de izquierda a derecha. */
const ORDEN = [...ESFUERZOS].reverse()

export function IconoEsfuerzo({ nivel, className = '' }) {
  const n = NIVELES[nivel] ?? NIVELES.MEDIO
  return (
    <span className={`inline-flex items-end gap-0.5 ${className}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ height: `${4 + i * 3}px` }} className={`w-1 rounded-sm ${i <= n.barras ? n.barra : 'bg-slate-200'}`} />
      ))}
    </span>
  )
}

export default function CampoEsfuerzo({ id, value, onChange, disabled = false, className = '' }) {
  return (
    <div id={id} role="radiogroup" aria-label="Esfuerzo" className={`grid grid-cols-5 gap-1.5 ${className}`}>
      {ORDEN.map((o) => {
        const elegido = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={elegido}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            title={`${o.label} · peso ${o.peso}`}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2 text-[11px] font-semibold leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:opacity-60 ${
              elegido ? NIVELES[o.value].activo : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <IconoEsfuerzo nivel={o.value} />
            <span className="text-center">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
