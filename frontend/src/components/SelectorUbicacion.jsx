import { useEffect, useState } from 'react'
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'

/**
 * Selector de ubicación en el mapa.
 *
 * El mapa es OpenStreetMap y la búsqueda usa su servicio público de geocodificación
 * (Nominatim): no hace falta clave de API ni una librería de mapas. El usuario
 * escribe la dirección, elige el resultado correcto, ve dónde queda y el texto
 * normalizado vuelve al formulario. También puede usar su ubicación actual.
 *
 * Si no hay internet, la dirección se puede escribir a mano: el mapa es una
 * ayuda, no un requisito.
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

const recorte = (lat, lng) => {
  const d = 0.004
  return `${lng - d},${lat - d},${lng + d},${lat + d}`
}

export default function SelectorUbicacion({ abierto, onCerrar, valorInicial = '', onAceptar }) {
  const [texto, setTexto] = useState(valorInicial)
  const [coords, setCoords] = useState(null)
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (abierto) {
      setTexto(valorInicial ?? '')
      setCoords(null)
      setResultados([])
      setError('')
    }
  }, [abierto, valorInicial])

  const buscar = async (e) => {
    e?.preventDefault()
    const consulta = texto.trim()
    if (consulta.length < 3) {
      setError('Escriba al menos 3 caracteres de la dirección.')
      return
    }
    setBuscando(true)
    setError('')
    try {
      const url = `${NOMINATIM}?format=json&limit=5&q=${encodeURIComponent(consulta)}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error('sin respuesta')
      const datos = await res.json()
      setResultados(datos)
      if (datos.length === 0) setError('No se encontraron direcciones con ese texto.')
    } catch {
      setError('No se pudo consultar el mapa. Puede escribir la dirección a mano.')
    } finally {
      setBuscando(false)
    }
  }

  const elegir = (r) => {
    setCoords({ lat: Number(r.lat), lng: Number(r.lon) })
    setTexto(r.display_name)
    setResultados([])
    setError('')
  }

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setError('Este navegador no permite obtener la ubicación.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        setTexto(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      },
      () => setError('No se pudo obtener la ubicación actual.'),
    )
  }

  const mapa = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${recorte(coords.lat, coords.lng)}&layer=mapnik&marker=${coords.lat},${coords.lng}`
    : null

  return (
    <Modal
      abierto={abierto}
      titulo="Seleccionar ubicación en el mapa"
      subtitulo="Busque la dirección, confirme el punto y vuelva al formulario"
      onCerrar={onCerrar}
      ancho="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Calle 10 # 5-32, Cúcuta"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar(e)}
            />
          </div>
          <button type="button" className="btn-primary" onClick={buscar} disabled={buscando}>
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
          <button type="button" className="btn-ghost" onClick={usarMiUbicacion}>
            <MapPinIcon className="h-4 w-4" /> Mi ubicación
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {resultados.length > 0 && (
          <ul className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1">
            {resultados.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-accent-50"
                  onClick={() => elegir(r)}
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {mapa ? (
          <iframe
            title="Mapa de la ubicación seleccionada"
            className="h-64 w-full rounded-xl border border-slate-200"
            src={mapa}
            loading="lazy"
          />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
            Busque una dirección para verla en el mapa.
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn-primary" onClick={() => onAceptar(texto)}>
            Usar esta dirección
          </button>
          <button type="button" className="btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  )
}
