import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import { FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

/**
 * Barra de búsqueda y filtros.
 *
 * En reposo es una sola fila: el buscador (si la página tiene uno), el botón
 * «Filtros» con el embudo y, cuando hay algo aplicado, un botón para borrarlo
 * todo. Los demás campos viven en un panel flotante pequeño, y cada filtro
 * aplicado aparece debajo como una etiqueta de color («Estado: Activo») que se
 * quita con su ✕.
 *
 * Las páginas no cambian: el buscador es el `<input type="search">` que ya
 * ponen dentro del panel; aquí se saca de allí y se coloca en la barra. Las
 * etiquetas se leen de los <label> de los campos. Los campos permanecen
 * montados aunque el panel esté cerrado para poder leerlos.
 */
const IGNORADOS = ['radio', 'button', 'submit', 'reset', 'hidden', 'file', 'search']

const esBuscador = (n) => isValidElement(n) && n.type === 'input' && n.props.type === 'search'

// Separa el buscador del resto de los campos; devuelve [camposSinBuscador, buscador, textoEtiqueta].
function sacarBuscador(children) {
  let buscador = null
  let etiqueta = null
  const rec = (n) => {
    if (!isValidElement(n) || buscador) return n
    if (esBuscador(n)) {
      buscador = n
      return null
    }
    if (n.props.children === undefined || typeof n.props.children === 'string') return n
    const hijos = Children.toArray(n.props.children)
    const i = hijos.findIndex(esBuscador)
    if (i !== -1) {
      buscador = hijos[i]
      const lab = hijos.find((h) => isValidElement(h) && h.type === 'label')
      if (lab && typeof lab.props.children === 'string') etiqueta = lab.props.children.trim()
      // Contenedor de solo «etiqueta + campo»: se va entero; si no, solo el campo.
      return hijos.length <= 2 ? null : cloneElement(n, undefined, ...hijos.filter((h) => h !== buscador))
    }
    return cloneElement(n, undefined, ...hijos.map(rec))
  }
  const resto = Children.toArray(children).map(rec)
  return [resto, buscador, etiqueta]
}

function etiquetaDe(el, form) {
  const porFor = el.id ? form.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null
  const texto = porFor?.textContent ?? el.closest('label')?.textContent ?? el.getAttribute('aria-label') ?? el.placeholder ?? el.name ?? ''
  return texto.replace(/[*:]/g, '').trim()
}

function leerFiltros(form) {
  const res = []
  form.querySelectorAll('select, input, textarea, fieldset[data-filtro]').forEach((el, i) => {
    // Grupo de opciones (radios): el valor es el texto de la opción elegida.
    if (el.tagName === 'FIELDSET') {
      const marcada = el.querySelector('input:checked')
      if (marcada && marcada.value !== '') {
        res.push({ id: `c${i}`, etiqueta: el.dataset.filtro, valor: marcada.closest('label')?.textContent.trim(), el })
      }
      return
    }
    if (IGNORADOS.includes(el.type) || el.disabled) return
    const etiqueta = etiquetaDe(el, form)
    if (el.type === 'checkbox') {
      if (el.checked && etiqueta) res.push({ id: `c${i}`, etiqueta, valor: null, el })
      return
    }
    // Los selectores con buscador muestran «Todos» como texto: el valor real está en su campo oculto.
    const real = el.getAttribute('role') === 'combobox' ? el.parentElement?.parentElement?.querySelector('input[type="hidden"]')?.value ?? el.value : el.value
    if (real === '' || !etiqueta) return
    const valor = el.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text : el.value
    res.push({ id: `c${i}`, etiqueta, valor, el })
  })
  return res
}

// Cambia el valor como lo haría una persona, para que React reciba el evento.
function vaciar(el) {
  if (el.tagName === 'FIELDSET') return el.querySelector('input[value=""]')?.click()
  if (el.type === 'checkbox') return el.click()
  if (el.getAttribute('role') === 'combobox') return el.parentElement?.parentElement?.dispatchEvent(new Event('vaciar-filtro'))
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, '')
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
}

export default function FiltrosDesplegable({
  titulo = 'Filtros',
  activos = 0,
  abiertoInicial = false,
  ariaLabel,
  resumen,
  pie,
  children,
}) {
  const [abierto, setAbierto] = useState(abiertoInicial)
  const [chips, setChips] = useState([])
  const [texto, setTexto] = useState('')
  const formRef = useRef(null)
  const borrarRef = useRef(() => {})
  const firma = useRef('')
  const [campos, buscador, etiquetaBuscador] = sacarBuscador(children)

  // En cada render se relee el formulario; solo se actualiza si algo cambió.
  useEffect(() => {
    const form = formRef.current
    if (!form) return
    const nuevos = leerFiltros(form)
    // Los campos con valor se resaltan (borde y fondo amarillo suave) vía CSS.
    form.querySelectorAll('select, input[type="date"]').forEach((el) => {
      if (el.value !== '') el.setAttribute('data-activo', '')
      else el.removeAttribute('data-activo')
    })
    const t = form.querySelector('input[type="search"]')?.value ?? ''
    const f = nuevos.map((c) => `${c.etiqueta}=${c.valor}`).join('|') + `#${t}`
    if (f !== firma.current) {
      firma.current = f
      setChips(nuevos)
      setTexto(t)
    }
  })

  // Atajo «F»: abre el panel de filtros (se cierra con Escape). No actúa al escribir en un
  // campo, con Ctrl/Alt/Cmd, ni con una ventana abierta.
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key.toLowerCase() !== 'f' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const t = e.target
      if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setAbierto(true)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  // El panel se cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => !formRef.current?.contains(e.target) && setAbierto(false)
    // Escape cierra; Ctrl/Cmd + Enter aplica y cierra desde cualquier campo del panel.
    const esc = (e) => {
      // Ctrl/Cmd + Mayús + L: borrar todos los filtros.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        borrarRef.current()
        return
      }
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])

  const total = chips.length || activos
  const hayAlgo = total > 0 || texto !== ''
  const buscadorEl = () => formRef.current?.querySelector('input[type="search"]')

  const borrarTodo = async () => {
    const el = buscadorEl()
    const pendientes = [...chips.map((c) => c.el), ...(el && el.value ? [el] : [])]
    for (const campo of pendientes) {
      vaciar(campo)
      await new Promise((r) => setTimeout(r, 0)) // un cambio por vez: los hooks de filtros no se pisan
    }
  }

  borrarRef.current = borrarTodo

  return (
    <form
      ref={formRef}
      className="card relative"
      onSubmit={(e) => e.preventDefault()}
      aria-label={ariaLabel ?? titulo}
    >
      <div className="flex items-center gap-2 p-2">
        {buscador && (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-accent-400/60">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0" />
            {cloneElement(buscador, {
              className:
                'w-full min-w-0 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
              'aria-label': etiquetaBuscador ?? buscador.props.placeholder ?? 'Buscar',
            })}
            {texto !== '' && (
              <button
                type="button"
                onClick={() => {
                  const el = buscadorEl()
                  if (el) {
                    vaciar(el)
                    el.focus()
                  }
                }}
                aria-label="Borrar búsqueda"
                title="Borrar búsqueda"
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-keyshortcuts="F"
          title="Filtros (F)"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
            total > 0 || abierto
              ? 'border-accent-500 bg-accent-400 text-brand-950'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FunnelIcon className="h-4 w-4" />
          {buscador ? 'Filtros' : titulo}
          {total > 0 && (
            <span className="rounded-full bg-brand-900 px-1.5 text-[11px] font-bold leading-[18px] text-white">{total}</span>
          )}
          <kbd className="hidden rounded border border-black/15 bg-white/60 px-1 font-sans text-[10px] font-bold text-slate-500 sm:inline">F</kbd>
        </button>

        {hayAlgo && (
          <button
            type="button"
            onClick={borrarTodo}
            aria-label="Borrar filtros"
            title="Borrar filtros"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white p-2 text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {resumen && <p className="px-4 pb-2 text-xs text-slate-500">{resumen}</p>}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2">
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
        </div>
      )}

      {/* Telón: oscurece el fondo y cierra el panel al hacer clic. */}
      {abierto && (
        <div className="fixed inset-0 z-40 bg-brand-950/30" onClick={() => setAbierto(false)} aria-hidden="true" />
      )}

      {/* Panel lateral fijo: ocupa toda la altura de la ventana, así nunca se recorta
          sin importar dónde esté la barra. Siempre montado para poder leer los valores. */}
      <aside
        aria-label="Filtros"
        className={`${abierto ? 'flex' : 'hidden'} fixed inset-y-0 right-0 z-50 w-[min(400px,100vw)] flex-col bg-white shadow-2xl [&_.grid]:!grid-cols-2 [&_.grid]:gap-3 [&_.input]:py-1.5 [&_input[data-activo]]:border-accent-500 [&_input[data-activo]]:bg-accent-50 [&_select[data-activo]]:border-accent-500 [&_select[data-activo]]:bg-accent-50 [&_.label]:mb-1 [&_.label]:text-xs [&_.label]:uppercase [&_.label]:tracking-wide [&_.label]:text-slate-500`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <FunnelIcon className="h-5 w-5 text-accent-500" /> Filtros
          </h2>
          <div className="flex items-center gap-1">
          {hayAlgo && (
            <button
              type="button"
              className="mr-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              aria-keyshortcuts="Control+Shift+L"
              title="Borrar todos los filtros (Ctrl + Mayús + L)"
              onClick={borrarTodo}
            >
              Borrar filtros
              <kbd className="hidden rounded border border-red-100 bg-red-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold whitespace-nowrap text-red-500 sm:inline">Ctrl ⇧ L</kbd>
            </button>
          )}
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar filtros"
            aria-keyshortcuts="Escape"
            className="flex items-center gap-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          >
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-400 sm:inline">Esc</kbd>
            <XMarkIcon className="h-5 w-5" />
          </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">{campos}</div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <div className="min-w-0">{pie}</div>
          <button
            type="button"
            className="btn-primary shrink-0 gap-2 whitespace-nowrap px-4 py-1.5 text-sm"
            aria-keyshortcuts="Control+Enter"
            title="Aplicar y cerrar (Ctrl + Enter)"
            onClick={() => setAbierto(false)}
          >
            Listo
            <kbd className="hidden rounded bg-brand-950/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold whitespace-nowrap sm:inline">Ctrl ↵</kbd>
          </button>
        </div>
      </aside>
    </form>
  )
}
