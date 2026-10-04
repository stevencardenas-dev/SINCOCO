import { forwardRef } from 'react'
import PhoneInput, { formatPhoneNumberIntl } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'

/**
 * Teléfono con indicativo y bandera del país.
 *
 * Se apoya en `react-phone-number-input` (MIT), que trae la lista completa de
 * países con su bandera, el formato y la validación por país de
 * libphonenumber-js. El selector de país es un `<select>` nativo: se puede
 * recorrer con el teclado y escribir para saltar al país, sin depender de un
 * desplegable propio.
 *
 * El valor que se guarda es E.164 (`+573001234567`), el formato estándar: no
 * depende de cómo se escriba y el país se puede deducir siempre del prefijo.
 * Los teléfonos guardados sin prefijo (datos anteriores) se interpretan como
 * Colombia, que es el país por defecto del sistema.
 */

const PAIS_POR_DEFECTO = 'CO'

/** Convierte el valor guardado a E.164, el formato que exige el componente. */
export function aE164(valor) {
  const texto = String(valor ?? '').trim()
  if (!texto) return undefined
  const limpio = texto.replace(/[^\d+]/g, '')
  if (limpio.startsWith('+')) {
    const digitos = limpio.slice(1).replace(/\+/g, '')
    return digitos ? `+${digitos}` : undefined
  }
  const digitos = limpio.replace(/\D/g, '')
  return digitos ? `+57${digitos}` : undefined
}

/** Presenta un teléfono guardado en formato legible: +57 300 123 4567. */
export function telefonoLegible(valor) {
  const e164 = aE164(valor)
  if (!e164) return String(valor ?? '')
  try {
    return formatPhoneNumberIntl(e164) || String(valor ?? '')
  } catch {
    return String(valor ?? '')
  }
}

// El campo hereda el estilo de los demás formularios y conserva la clase
// `PhoneInputInput`, que la librería usa para estirarlo y encogerlo.
const EntradaTelefono = forwardRef(function EntradaTelefono({ className, ...props }, ref) {
  return <input ref={ref} {...props} className={`input ${className ?? ''}`.trim()} />
})

export default function TelefonoPais({ id, value, onChange, error = false, disabled = false }) {
  return (
    <PhoneInput
      id={id}
      name={id}
      value={aE164(value)}
      onChange={(nuevo) => onChange(nuevo ?? '')}
      defaultCountry={PAIS_POR_DEFECTO}
      flags={flags}
      inputComponent={EntradaTelefono}
      placeholder="300 123 4567"
      disabled={disabled}
      className={error ? 'telefono-error' : undefined}
    />
  )
}
