import { useRef, useState } from 'react'
import { CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { reducirImagen } from '../lib/imagen.js'

/** Foto de evidencia: tomarla con la cámara o elegirla de la galería; `value` es una data URL. */
export default function CampoFoto({ value, onChange }) {
  const camara = useRef(null)
  const galeria = useRef(null)
  const [error, setError] = useState('')

  const elegir = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    try {
      setError('')
      onChange(await reducirImagen(archivo))
    } catch (err) {
      setError(err.message || 'No se pudo procesar la foto.')
    }
  }

  return (
    <div>
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={elegir} />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={elegir} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost inline-flex items-center gap-1" onClick={() => camara.current.click()}>
          <CameraIcon className="h-4 w-4" /> Tomar foto
        </button>
        <button type="button" className="btn-ghost inline-flex items-center gap-1" onClick={() => galeria.current.click()}>
          <PhotoIcon className="h-4 w-4" /> Elegir de la galería
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {value && (
        <div className="relative mt-2 inline-block">
          <img src={value} alt="Foto de la evidencia" className="max-h-40 rounded-lg border border-slate-200" />
          <button type="button" aria-label="Quitar foto" onClick={() => onChange('')}
            className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow border border-slate-200">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
