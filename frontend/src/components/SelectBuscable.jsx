import { Children, Fragment, isValidElement } from 'react'
import BuscadorSelect from './BuscadorSelect.jsx'

/**
 * Reemplazo directo de `<select>` con buscador: acepta los mismos props y los
 * mismos `<option>` hijos, y llama a `onChange` con `{ target: { value } }`,
 * así que las pantallas migran cambiando solo el nombre de la etiqueta.
 * La opción de valor vacío se muestra como «sin selección» (placeholder).
 */
const texto = (nodo) => {
  if (nodo === null || nodo === undefined || nodo === false || nodo === true) return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(texto).join('')
  return texto(nodo.props?.children)
}

function opcionesDe(hijos, salida = []) {
  Children.forEach(hijos, (h) => {
    if (!isValidElement(h)) return
    if (h.type === Fragment) opcionesDe(h.props.children, salida)
    else if (h.type === 'option') {
      const value = h.props.value ?? texto(h.props.children)
      salida.push({ value: String(value), label: texto(h.props.children) })
    }
  })
  return salida
}

export default function SelectBuscable({ id, value, onChange, required, disabled, className = '', children, 'aria-label': ariaLabel }) {
  const todas = opcionesDe(children)
  const vacia = todas.find((o) => o.value === '')
  const opciones = todas.map((o) => (o.value === '' ? { ...o, label: o.label || 'Sin selección' } : o))
  return (
    <BuscadorSelect
      id={id ?? ariaLabel}
      value={value ?? ''}
      onChange={(v) => onChange?.({ target: { value: String(v ?? '') }, currentTarget: { value: String(v ?? '') } })}
      opciones={opciones}
      vacio={vacia?.label || 'Sin selección'}
      placeholder={vacia?.label || 'Escriba para buscar…'}
      requerido={required}
      disabled={disabled}
      error={/red-/.test(className)}
    />
  )
}
