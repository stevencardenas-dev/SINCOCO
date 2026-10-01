export default function StatCard({ icon: Icon, label, value, hint, title, tone = 'brand' }) {
  // `accent` es el amarillo de marca (indicador protagonista); `brand` es el
  // gris grafito y `amber` queda para las alertas.
  const tones = {
    accent: 'bg-accent-400 text-brand-950 ring-1 ring-inset ring-accent-500/30',
    brand: 'bg-brand-100 text-brand-700',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="card flex items-start gap-4 p-5 transition-shadow hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p
          className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900"
          title={title}
        >
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}