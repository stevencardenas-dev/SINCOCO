import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

/**
 * Campo de selección con búsqueda (combobox).
 *
 * Un `<select>` nativo se vuelve incómodo cuando la lista crece: hay que
 * recorrer decenas de responsables, trabajadores o clientes a ojo. Aquí el
 * mismo campo filtra en la medida en que se escriben caracteres, así que el
 * usuario escribe «perez» y elige. El valor elegido se anuncia con
 * `aria-activedescendant` y se puede recorrer con las flechas y Enter.
 *
 * La comparación ignora mayúsculas y tildes (la colación de la base hace lo
 * mismo), para que «perez» encuentre «Pérez».
 */
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export default function BuscadorSelect({
  id,
  value,
  onChange,
  opciones = [],
  placeholder = 'Escriba para buscar…',
  vacio = 'Sin asignar',
  requerido = false,
  disabled = false,
  error = false,
  className = '',
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [activo, setActivo] = useState(0)
  const contenedor = useRef(null)

  const seleccionada = opciones.find((o) => String(o.value) === String(value ?? '')) ?? null

  const filtradas = useMemo(() => {
    const t = normalizar(texto)
    if (!t) return opciones
    return opciones.filter(
      (o) => normalizar(o.label).includes(t) || normalizar(o.sublabel).includes(t),
    )
  }, [opciones, texto])

  // Cierra al hacer clic fuera.
  useEffect(() => {
    if (!abierto) return undefined
    const alClic = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    return () => document.removeEventListener('mousedown', alClic)
  }, [abierto])

  const abrir = () => {
    if (disabled) return
    setAbierto(true)
    setTexto('') // muestra la lista completa al abrir
    setActivo(0)
  }

  const elegir = (opcion) => {
    onChange(opcion ? opcion.value : '')
    setAbierto(false)
    setTexto('')
  }

  const alTeclear = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key)) return
    setAbierto(true)
    setActivo(0)
  }

  const alPresionar = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAbierto(true)
      setActivo((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (abierto && filtradas[activo]) {
        e.preventDefault()
        elegir(filtradas[activo])
      }
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  const valorMostrado = abierto ? texto : seleccionada?.label ?? ''

  return (
    <div ref={contenedor} className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={abierto}
          aria-controls={`${id}-opciones`}
          aria-autocomplete="list"
          disabled={disabled}
          required={requerido && !seleccionada}
          placeholder={seleccionada ? seleccionada.label : placeholder}
          className={`${error ? 'input border-red-400' : 'input'} pl-9 pr-9`}
          value={valorMostrado}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={abrir}
          onKeyDown={alPresionar}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
        />
        <ChevronUpDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {/* Valor real del campo, por si lo consume un formulario o una prueba. */}
      <input type="hidden" name={id} value={value ?? ''} />

      {abierto && (
        <ul
          id={`${id}-opciones`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {opciones.some((o) => !o.value) && (
            <li
              role="option"
              aria-selected={!seleccionada}
              className="cursor-pointer px-3.5 py-2 text-sm text-slate-500 hover:bg-slate-50"
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(null)
              }}
            >
              {vacio}
            </li>
          )}

          {filtradas.length === 0 && (
            <li className="px-3.5 py-3 text-sm text-slate-400">
              Sin coincidencias para «{texto}».
            </li>
          )}

          {filtradas.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={String(o.value) === String(value ?? '')}
              onMouseEnter={() => setActivo(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(o)
              }}
              className={`cursor-pointer px-3.5 py-2 text-sm ${
                i === activo ? 'bg-accent-50 text-brand-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="block font-medium">{o.label}</span>
              {o.sublabel && <span className="block text-xs text-slate-400">{o.sublabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
