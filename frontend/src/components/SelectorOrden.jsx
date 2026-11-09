import { ArrowsUpDownIcon } from '@heroicons/react/24/outline'

/** Selector compacto de orden para listados en tarjetas. `opciones`: [{ value, label }]. */
export default function SelectorOrden({ opciones, value, onChange }) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-2 text-slate-600 focus-within:ring-2 focus-within:ring-accent-400">
      <ArrowsUpDownIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Ordenar por</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title="Ordenar por"
        className="cursor-pointer bg-transparent text-xs font-semibold outline-none"
      >
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
