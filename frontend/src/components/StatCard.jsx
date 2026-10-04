export default function StatCard({ icon: Icon, label, value, hint, title, tone = 'brand' }) {
  // `accent` es el amarillo de marca (indicador protagonista); `brand` es el
  // gris grafito y `amber` queda para las alertas.
  const tones = {
    accent: 'bg-gradient-to-br from-accent-300 to-accent-500 text-brand-950 ring-1 ring-inset ring-accent-500/30 shadow-sm',
    brand: 'bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700',
    amber: 'bg-gradient-to-br from-amber-100 to-amber-300 text-amber-700',
    slate: 'bg-gradient-to-br from-accent-100 to-accent-200 text-brand-800',
  }

  return (
    <div className="card flex items-start gap-4 bg-gradient-to-br from-white to-accent-50 p-5 transition-shadow hover:shadow-md">
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