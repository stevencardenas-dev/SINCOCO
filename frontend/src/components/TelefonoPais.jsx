import { useMemo } from 'react'
import BuscadorSelect from './BuscadorSelect.jsx'

/**
 * Teléfono con indicativo de país.
 *
 * El usuario elige el país (con búsqueda, igual que los demás campos de lista)
 * y escribe el número local; el valor que se guarda es el indicativo más el
 * número (`+57 3001234567`). El campo del número solo admite dígitos.
 */
export const PAISES = [
  { codigo: '+57', iso: 'CO', nombre: 'Colombia' },
  { codigo: '+52', iso: 'MX', nombre: 'México' },
  { codigo: '+54', iso: 'AR', nombre: 'Argentina' },
  { codigo: '+56', iso: 'CL', nombre: 'Chile' },
  { codigo: '+51', iso: 'PE', nombre: 'Perú' },
  { codigo: '+593', iso: 'EC', nombre: 'Ecuador' },
  { codigo: '+58', iso: 'VE', nombre: 'Venezuela' },
  { codigo: '+591', iso: 'BO', nombre: 'Bolivia' },
  { codigo: '+595', iso: 'PY', nombre: 'Paraguay' },
  { codigo: '+598', iso: 'UY', nombre: 'Uruguay' },
  { codigo: '+507', iso: 'PA', nombre: 'Panamá' },
  { codigo: '+506', iso: 'CR', nombre: 'Costa Rica' },
  { codigo: '+502', iso: 'GT', nombre: 'Guatemala' },
  { codigo: '+503', iso: 'SV', nombre: 'El Salvador' },
  { codigo: '+504', iso: 'HN', nombre: 'Honduras' },
  { codigo: '+505', iso: 'NI', nombre: 'Nicaragua' },
  { codigo: '+1', iso: 'US', nombre: 'Estados Unidos' },
  { codigo: '+34', iso: 'ES', nombre: 'España' },
  { codigo: '+55', iso: 'BR', nombre: 'Brasil' },
]

const POR_DEFECTO = '+57'

/** Separa un teléfono guardado en indicativo + número local. */
export function partirTelefono(valor) {
  const texto = String(valor ?? '').trim()
  if (!texto) return { codigo: POR_DEFECTO, numero: '' }
  // El indicativo coincide con el prefijo más largo de la lista.
  const pais = [...PAISES]
    .sort((a, b) => b.codigo.length - a.codigo.length)
    .find((p) => texto.startsWith(p.codigo))
  if (!pais) return { codigo: POR_DEFECTO, numero: texto.replace(/\D/g, '') }
  return { codigo: pais.codigo, numero: texto.slice(pais.codigo.length).replace(/\D/g, '') }
}

export default function TelefonoPais({ id, value, onChange, error = false, disabled = false }) {
  const { codigo, numero } = useMemo(() => partirTelefono(value), [value])

  const opciones = PAISES.map((p) => ({
    value: p.codigo,
    label: `${p.codigo} ${p.nombre}`,
    sublabel: p.iso,
  }))

  const emitir = (nuevoCodigo, nuevoNumero) => {
    const limpio = String(nuevoNumero ?? '').replace(/\D/g, '')
    onChange(limpio ? `${nuevoCodigo} ${limpio}` : '')
  }

  return (
    <div className="flex gap-2">
      <div className="w-40 shrink-0">
        <BuscadorSelect
          id={`${id}-pais`}
          value={codigo}
          onChange={(c) => emitir(c || POR_DEFECTO, numero)}
          opciones={opciones}
          placeholder="País…"
          disabled={disabled}
        />
      </div>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="3001234567"
        disabled={disabled}
        className={`${error ? 'input border-red-400' : 'input'} tabular-nums`}
        value={numero}
        onChange={(e) => emitir(codigo, e.target.value)}
      />
    </div>
  )
}
