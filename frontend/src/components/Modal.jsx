import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

/**
 * Ventana emergente (modal) reutilizable.
 *
 * Los formularios cortos se abren encima de la pantalla en vez de empujar el
 * contenido hacia abajo: si el formulario aparece al final de la página, el
 * usuario tiene que bajar y pierde de vista lo que estaba haciendo.
 *
 * Se cierra con Escape, con el botón de la esquina y haciendo clic fuera.
 */
export default function Modal({ abierto, titulo, subtitulo, onCerrar, children, ancho = 'max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return undefined

    const alPresionar = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionar)
    // Bloquea el scroll del fondo mientras el modal está abierto.
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = overflowPrevio
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={onCerrar}
    >
      <div
        className={`max-h-[92vh] w-full ${ancho} overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
            {subtitulo && <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-900"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
