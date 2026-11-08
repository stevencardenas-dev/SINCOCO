// «Foto» provisional: iniciales sobre un color estable por persona. Cuando exista
// `foto_url` en el backend basta pasar `src` y se muestra la imagen.
const COLORES = [
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]

export default function Avatar({ nombre = '', semilla = nombre, src, className = 'h-12 w-12 text-base' }) {
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
  const hash = [...String(semilla)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  if (src) return <img src={src} alt={nombre} className={`rounded-full object-cover ${className}`} />
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${COLORES[hash % COLORES.length]} ${className}`}
    >
      {iniciales || '?'}
    </span>
  )
}
