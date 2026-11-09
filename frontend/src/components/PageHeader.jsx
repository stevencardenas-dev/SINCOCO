/**
 * Encabezado de página. `accion` (p. ej. el botón de actualizar) va en la misma
 * fila que el título y no baja de línea al estrechar la pantalla; los demás
 * botones (`children`) pasan debajo cuando no caben.
 */
import { useEffect, useRef } from 'react'

export default function PageHeader({ title, subtitle, accion, children }) {
  const acciones = useRef(null)

  // Atajo «N»: pulsa el botón principal de la página (el amarillo). No actúa al escribir en un
  // campo, con Ctrl/Alt/Cmd, ni con una ventana abierta.
  useEffect(() => {
    const boton = () => acciones.current?.querySelector('.btn-primary:not(:disabled)')
    const b = boton()
    if (b && !b.dataset.atajo) {
      b.dataset.atajo = 'N'
      b.setAttribute('aria-keyshortcuts', 'N')
      b.title = `${b.title || b.textContent.trim()} (N)`
      const k = document.createElement('kbd')
      k.className = 'hidden rounded border border-black/15 bg-white/60 px-1 font-sans text-[10px] font-bold text-slate-500 sm:inline'
      k.textContent = 'N'
      b.append(k)
    }
    const alTeclear = (e) => {
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const t = e.target
      if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')) return
      if (document.querySelector('[role="dialog"]')) return
      const el = boton()
      if (!el) return
      e.preventDefault()
      el.click()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {/* Realce amarillo de marca junto al título de la página */}
          <span className="h-5 w-1.5 shrink-0 rounded-full bg-accent-400" aria-hidden="true" />
          <h2 className="min-w-0 text-xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">{title}</h2>
          {accion && <div className="ml-1 shrink-0">{accion}</div>}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div ref={acciones} className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  )
}
