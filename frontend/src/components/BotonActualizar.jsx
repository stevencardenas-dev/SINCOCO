import { useEffect, useRef, useState } from 'react'
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const GIRO_MINIMO_MS = 600
const AVISO_MS = 1800

/**
 * Botón «Actualizar» reducido al ícono.
 *
 * Al presionarlo el ícono gira mientras se recargan los datos y, al terminar,
 * aparece un aviso breve («Datos actualizados») para que la persona sepa que la
 * acción se hizo, incluso cuando los datos no cambiaron. `onClick` puede
 * devolver una promesa; si no la devuelve, el giro dura el mínimo.
 */
export default function BotonActualizar({ onClick, cargando = false, titulo = 'Actualizar' }) {
  const [girando, setGirando] = useState(false)
  const [hecho, setHecho] = useState(false)
  const temporizador = useRef(null)
  const montado = useRef(true)

  useEffect(
    () => () => {
      montado.current = false
      clearTimeout(temporizador.current)
    },
    [],
  )

  const actualizar = async () => {
    if (girando) return
    setGirando(true)
    setHecho(false)
    clearTimeout(temporizador.current)
    const inicio = Date.now()
    try {
      await onClick?.()
    } catch {
      // Cada página muestra su propio error de carga.
    }
    const falta = GIRO_MINIMO_MS - (Date.now() - inicio)
    if (falta > 0) await new Promise((r) => setTimeout(r, falta))
    if (!montado.current) return
    setGirando(false)
    setHecho(true)
    temporizador.current = setTimeout(() => montado.current && setHecho(false), AVISO_MS)
  }

  return (
    <>
      <button
        type="button"
        onClick={actualizar}
        disabled={girando}
        title={titulo}
        aria-label={titulo}
        className="btn-ghost px-3"
      >
        <ArrowPathIcon className={`h-4 w-4 ${girando || cargando ? 'animate-spin' : ''}`} />
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {hecho ? 'Datos actualizados' : ''}
      </span>
      {hecho && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          <CheckCircleIcon className="h-5 w-5 text-accent-400" /> Datos actualizados
        </div>
      )}
    </>
  )
}
