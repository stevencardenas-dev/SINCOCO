import { useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

/**
 * Campo de contraseña con el botón del ojito para mostrarla u ocultarla.
 *
 * Recibe las mismas props que un <input> (id, value, onChange, required,
 * minLength, autoComplete…) y las pasa tal cual. Cada campo guarda su propia
 * visibilidad, así que mostrar uno no revela los demás. El botón es
 * type="button" para no enviar el formulario, y el input lleva `pr-10` para
 * que el ícono no tape el texto.
 */
export default function CampoPassword({ className = '', ...props }) {
  const [visible, setVisible] = useState(false)
  const Icono = visible ? EyeSlashIcon : EyeIcon
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`input pr-10 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:text-accent-500"
      >
        <Icono className="h-5 w-5" />
      </button>
    </div>
  )
}
