import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

/**
 * Panel de búsqueda y filtros plegable.
 *
 * Cerrado es una barra delgada: muestra, como etiquetas de color, cada filtro
 * aplicado con su nombre y valor («Estado: Activo»), y cada una se puede quitar
 * con su ✕. Abierto despliega los campos de la página, en versión compacta.
 *
 * Las etiquetas se leen de los propios campos del formulario (select, input y
 * casillas con su <label>), así que las páginas no tienen que describir sus
 * filtros: basta con que los campos tengan etiqueta. Los campos permanecen
 * montados aunque el panel esté cerrado para poder leerlos.
 */
const IGNORADOS = ['radio', 'button', 'submit', 'reset', 'hidden', 'file']

function etiquetaDe(el, form) {
  const porFor = el.id ? form.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null
  const texto = porFor?.textContent ?? el.closest('label')?.textContent ?? el.getAttribute('aria-label') ?? el.placeholder ?? el.name ?? ''
  return texto.replace(/[*:]/g, '').trim()
}

function leerFiltros(form) {
  const res = []
  form.querySelectorAll('select, input, textarea').forEach((el, i) => {
    if (IGNORADOS.includes(el.type) || el.disabled) return
    const etiqueta = etiquetaDe(el, form)
    if (el.type === 'checkbox') {
      if (el.checked && etiqueta) res.push({ id: `c${i}`, etiqueta, valor: null, el })
      return
    }
    if (el.value === '' || !etiqueta) return
    const valor = el.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text : el.value
    res.push({ id: `c${i}`, etiqueta, valor, el })
  })
  return res
}

// Cambia el valor como lo haría una persona, para que React reciba el evento.
function vaciar(el) {
  if (el.type === 'checkbox') return el.click()
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, '')
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
}

export default function FiltrosDesplegable({
  titulo,
  activos = 0,
  abiertoInicial = false,
  ariaLabel,
  children,
}) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  const [chips, setChips] = useState([])
  const formRef = useRef(null)
  const firma = useRef('')

  // En cada render se relee el formulario; solo se actualiza si algo cambió.
  useEffect(() => {
    if (!formRef.current) return
    const nuevos = leerFiltros(formRef.current)
    const f = nuevos.map((c) => `${c.etiqueta}=${c.valor}`).join('|')
    if (f !== firma.current) {
      firma.current = f
      setChips(nuevos)
    }
  })

  const total = chips.length || activos
  const limpiarTodo = async () => {
    for (const c of chips) {
      vaciar(c.el)
      await new Promise((r) => setTimeout(r, 0)) // un cambio por vez: los hooks de filtros no se pisan
    }
  }

  return (
    <form
      ref={formRef}
      className={`card transition-colors ${total > 0 ? 'border-accent-300 bg-accent-50/30 ring-1 ring-accent-200' : ''}`}
      onSubmit={(e) => e.preventDefault()}
      aria-label={ariaLabel ?? titulo}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex items-center gap-2 rounded-lg py-0.5 text-left text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        >
          <FunnelIcon className={`h-4 w-4 ${total > 0 ? 'text-accent-600' : 'text-slate-400'}`} />
          <span className="text-sm font-semibold">{titulo}</span>
          {total > 0 && (
            <span className="rounded-full bg-accent-400 px-1.5 text-[11px] font-bold leading-5 text-brand-950">{total}</span>
          )}
          <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </button>

        {chips.map((c) => (
          <span
            key={c.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent-100 py-0.5 pl-2.5 pr-1 text-xs text-brand-900 ring-1 ring-accent-300"
          >
            <span className="font-medium">{c.etiqueta}</span>
            {c.valor !== null && <span className="max-w-[160px] truncate font-semibold">: {c.valor}</span>}
            <button
              type="button"
              onClick={() => vaciar(c.el)}
              aria-label={`Quitar filtro ${c.etiqueta}`}
              className="rounded-full p-0.5 text-brand-700 hover:bg-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        {chips.length > 1 && (
          <button
            type="button"
            onClick={limpiarTodo}
            className="ml-auto rounded-lg px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Siempre montado (hidden) para poder leer los valores de los campos. */}
      <div
        hidden={!abierto}
        className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 [&_.grid]:gap-3 [&_.input]:py-1.5 [&_.label]:mb-1 [&_.label]:text-xs [&_.label]:text-slate-500"
      >
        {children}
      </div>
    </form>
  )
}
