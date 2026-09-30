/**
 * Marca de SINCOCO: un casco de obra sobre el amarillo de seguridad.
 *
 * Se usa en el sidebar, en el login y (misma figura) en public/favicon.svg.
 * El casco se dibuja con `currentColor` para que herede el gris grafito del
 * texto y funcione igual sobre fondo claro u oscuro.
 */
export default function Logo({ className = 'h-10 w-10', title = 'SINCOCO' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-accent-400 text-brand-950 shadow-sm ring-1 ring-inset ring-accent-500/40 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-[64%] w-[64%]" role="img" aria-label={title}>
        <title>{title}</title>
        {/* Casquete */}
        <path
          d="M6.6 15.9v-4.6a5.4 5.4 0 0 1 10.8 0v4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        {/* Cresta central */}
        <path
          d="M12 6.6v9.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity=".4"
        />
        {/* Ala */}
        <rect x="2.6" y="15.4" width="18.8" height="2.7" rx="1.35" fill="currentColor" />
      </svg>
    </span>
  )
}
