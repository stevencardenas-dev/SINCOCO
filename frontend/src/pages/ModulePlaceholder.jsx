import { ClockIcon } from '@heroicons/react/24/outline'

/**
 * Módulo aún no disponible.
 *
 * Varias opciones del menú ya existen para mostrar la estructura del sistema,
 * pero su funcionalidad llega en los siguientes sprints. En vez de una pantalla
 * vacía, se explica en qué consiste el módulo y se marca como «Próximamente».
 */
export default function ModulePlaceholder({ title, descripcion }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-100 text-brand-800 ring-1 ring-accent-200">
        <ClockIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      <span className="badge mt-2 bg-accent-50 text-brand-700 ring-1 ring-accent-200">
        Próximamente
      </span>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">{descripcion}</p>
    </div>
  )
}
