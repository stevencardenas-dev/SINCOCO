import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

/**
 * Menú de acciones secundarias («⋯»). Se dibuja sobre toda la página (portal) para
 * que no lo recorte un contenedor con scroll, como el cronograma.
 *
 * `items`: [{ label, icono, onClick | to, peligro, deshabilitado }]. Los `null`/`false` se omiten.
 */
export default function MenuAcciones({ items, etiqueta = 'Más acciones', texto = null, className = '' }) {
  const [pos, setPos] = useState(null)
  const boton = useRef(null)
  const lista = items.filter(Boolean)

  useEffect(() => {
    if (!pos) return undefined
    const cerrar = () => setPos(null)
    const tecla = (e) => e.key === 'Escape' && cerrar()
    window.addEventListener('keydown', tecla)
    window.addEventListener('resize', cerrar)
    window.addEventListener('scroll', cerrar, true)
    return () => {
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('resize', cerrar)
      window.removeEventListener('scroll', cerrar, true)
    }
  }, [pos])

  if (lista.length === 0) return null

  const abrir = (e) => {
    e.stopPropagation()
    if (pos) return setPos(null)
    const r = boton.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }

  const clase = (it) =>
    `flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium disabled:opacity-50 ${
      it.peligro ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
    }`

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={abrir}
        aria-haspopup="menu"
        aria-expanded={Boolean(pos)}
        title={etiqueta}
        aria-label={etiqueta}
        className={className || 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50'}
      >
        <EllipsisHorizontalIcon className="h-4 w-4" />
        {texto}
      </button>
      {pos &&
        createPortal(
          <div className="fixed inset-0 z-[70]" onClick={(e) => { e.stopPropagation(); setPos(null) }}>
            <div
              role="menu"
              className="absolute w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
              style={{ top: pos.top, right: pos.right }}
            >
              {lista.map((it) =>
                it.to ? (
                  <Link key={it.label} to={it.to} role="menuitem" className={clase(it)}>
                    {it.icono && <it.icono className="h-4 w-4 shrink-0" />} {it.label}
                  </Link>
                ) : (
                  <button
                    key={it.label}
                    type="button"
                    role="menuitem"
                    disabled={it.deshabilitado}
                    className={clase(it)}
                    onClick={() => { setPos(null); it.onClick?.() }}
                  >
                    {it.icono && <it.icono className="h-4 w-4 shrink-0" />} {it.label}
                  </button>
                ),
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
