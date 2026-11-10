import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

/** Segundos que permanece visible la confirmación de éxito antes de ocultarse sola. */
const SEGUNDOS_AVISO = 5

/**
 * Aviso de un formulario (error o confirmación).
 *
 * Va DENTRO del formulario, no en la raíz de la página: si el error de una
 * regla de negocio se pinta detrás o encima de la tabla, el usuario no lo
 * relaciona con el campo que acaba de diligenciar. Por eso este componente se
 * usa en los modales y en los bloques de captura, nunca al nivel del listado.
 *
 * `role="alert"` / `role="status"` se conservan: son los que anuncian los
 * lectores de pantalla y los que esperan las pruebas de interfaz.
 */
export default function AlertaFormulario({ tipo = 'error', mensaje, campo }) {
  // La confirmación de éxito se oculta sola a los 5 s; cada mensaje nuevo reinicia el tiempo. Los errores no.
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (tipo !== 'aviso' || !mensaje) return undefined
    setVisible(true)
    const id = setTimeout(() => setVisible(false), SEGUNDOS_AVISO * 1000)
    return () => clearTimeout(id)
  }, [tipo, mensaje])

  if (!mensaje) return null

  if (tipo === 'aviso') {
    if (!visible) return null
    // Ventana emergente que sube desde abajo, con una barra que se vacía durante los 5 s que permanece visible.
    // Va en un portal para no empujar el contenido de la pantalla ni quedar tapada por el panel lateral.
    return createPortal(
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
        <div
          key={mensaje}
          role="status"
          aria-live="polite"
          style={{ '--toast-duracion': `${SEGUNDOS_AVISO}s` }}
          className="toast-aviso pointer-events-auto relative w-full max-w-md overflow-hidden rounded-xl border-l-4 border-accent-400 bg-brand-900 text-white shadow-2xl ring-1 ring-black/10"
        >
          <div className="flex items-start gap-3 px-4 py-3 text-sm font-medium">
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />
            <span>{mensaje}</span>
          </div>
          <div className="h-1 w-full bg-white/10">
            <div className="toast-progreso h-full bg-accent-400" />
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <p
      role="alert"
      data-campo={campo ?? undefined}
      className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
    >
      <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {mensaje}
        {campo && <span className="mt-0.5 block text-xs font-normal">Revise el campo señalado.</span>}
      </span>
    </p>
  )
}
