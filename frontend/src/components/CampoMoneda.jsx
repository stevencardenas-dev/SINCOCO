import { fmtMiles, montoEnPalabras, soloDigitos } from '../lib/format.js'

/**
 * Campo de dinero (COP) universal: prefijo «$», miles con punto mientras se
 * escribe y, debajo, el monto en palabras para no confundir la magnitud.
 *
 * El valor que entra y sale es solo dígitos (cadena): `onChange('10000000')`.
 * Quien guarda decide si lo envía como número o como cadena.
 */
export default function CampoMoneda({
  id,
  value,
  onChange,
  placeholder = '0',
  maxDigitos = 13,
  requerido = false,
  disabled = false,
  className = '',
  ayuda,
}) {
  const palabras = montoEnPalabras(value)
  return (
    <div className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={requerido}
          disabled={disabled}
          placeholder={placeholder}
          className="input pl-8 pr-14 tabular-nums"
          value={fmtMiles(value ?? '')}
          onChange={(e) => onChange(soloDigitos(e.target.value).slice(0, maxDigitos))}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold tracking-wide text-slate-400">COP</span>
      </div>
      {(palabras || ayuda) && (
        <p className="mt-1 text-xs text-slate-500">
          {palabras && <span className="font-medium text-slate-600">{palabras}</span>}
          {palabras && ayuda && ' · '}
          {ayuda}
        </p>
      )}
    </div>
  )
}
