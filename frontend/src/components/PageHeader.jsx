/**
 * Encabezado de página. `accion` (p. ej. el botón de actualizar) va en la misma
 * fila que el título y no baja de línea al estrechar la pantalla; los demás
 * botones (`children`) pasan debajo cuando no caben.
 */
export default function PageHeader({ title, subtitle, accion, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {/* Realce amarillo de marca junto al título de la página */}
          <span className="h-5 w-1.5 shrink-0 rounded-full bg-accent-400" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          {accion && <div className="ml-1 shrink-0">{accion}</div>}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  )
}
