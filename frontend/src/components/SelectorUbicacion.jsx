import { useCallback, useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'

// El mapa es Leaflet sobre OpenStreetMap y la búsqueda usa su servicio público
// de geocodificación (Nominatim): no hace falta clave de API. El usuario puede
// mover y acercar el mapa, arrastrar el marcador, hacer clic en el punto exacto,
// buscar la dirección o usar su ubicación actual. El texto normalizado vuelve al
// formulario. Si no hay internet, la dirección se puede escribir a mano: el mapa
// es una ayuda, no un requisito.
import icono from 'leaflet/dist/images/marker-icon.png'
import icono2x from 'leaflet/dist/images/marker-icon-2x.png'
import sombra from 'leaflet/dist/images/marker-shadow.png'

// Los iconos por defecto de Leaflet no resuelven sus rutas cuando el bundler
// procesa el CSS; se importan como activos y se registran explícitamente.
L.Icon.Default.mergeOptions({ iconUrl: icono, iconRetinaUrl: icono2x, shadowUrl: sombra })

const NOMINATIM_BUSCAR = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSO = 'https://nominatim.openstreetmap.org/reverse'

// El servicio de direcciones es público y puede tardar: si no responde en unos
// segundos se sigue con el mapa y la dirección se escribe a mano.
const TIEMPO_LIMITE = 8000

const pedirJson = async (url) => {
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE)
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: control.signal })
    if (!res.ok) throw new Error('sin respuesta')
    return await res.json()
  } finally {
    clearTimeout(reloj)
  }
}

// Cúcuta: sede de la constructora, punto de partida del mapa.
const CENTRO_POR_DEFECTO = [7.8891, -72.4967]
const ZOOM_POR_DEFECTO = 13
const ZOOM_ACERCAMIENTO = 17

/** Centra el mapa en la ubicación elegida y recalcula su tamaño al abrir el modal. */
function AjustarVista({ coords }) {
  const map = useMap()

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(t)
  }, [map])

  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), ZOOM_ACERCAMIENTO), {
        duration: 0.6,
      })
    }
  }, [coords, map])

  return null
}

/** Un clic en el mapa coloca el punto: no hace falta arrastrar el marcador. */
function ClicEnMapa({ onCoords }) {
  useMapEvents({
    click(e) {
      onCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function SelectorUbicacion({ abierto, onCerrar, valorInicial = '', onAceptar }) {
  const [texto, setTexto] = useState(valorInicial)
  const [coords, setCoords] = useState(null)
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [ubicando, setUbicando] = useState(false)

  const buscarDireccion = useCallback(async (consulta) => {
    const url = `${NOMINATIM_BUSCAR}?format=json&limit=5&q=${encodeURIComponent(consulta)}`
    return pedirJson(url)
  }, [])

  /** Traduce el punto a una dirección legible; si falla, se queda la anterior. */
  const describirPunto = useCallback(async ({ lat, lng }) => {
    setUbicando(true)
    try {
      const url = `${NOMINATIM_REVERSO}?format=json&lat=${lat}&lon=${lng}&zoom=18`
      const datos = await pedirJson(url)
      if (datos?.display_name) setTexto(datos.display_name)
    } catch {
      setTexto(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } finally {
      setUbicando(false)
    }
  }, [])

  // Al abrir: se restaura el valor del formulario y, si ya hay una dirección,
  // se busca una sola vez para que el mapa aparezca sobre el punto guardado.
  useEffect(() => {
    if (!abierto) return undefined
    const inicial = String(valorInicial ?? '').trim()
    setTexto(inicial)
    setCoords(null)
    setResultados([])
    setError('')
    if (inicial.length < 3) return undefined

    let vigente = true
    buscarDireccion(inicial)
      .then((datos) => {
        if (vigente && datos.length > 0) {
          setCoords({ lat: Number(datos[0].lat), lng: Number(datos[0].lon) })
        }
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [abierto, valorInicial, buscarDireccion])

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
      const datos = await buscarDireccion(consulta)
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

  /** Punto elegido con el ratón (clic o arrastre del marcador). */
  const fijarEnMapa = (punto) => {
    const siguiente = { lat: punto.lat, lng: punto.lng }
    setCoords(siguiente)
    setResultados([])
    setError('')
    describirPunto(siguiente)
  }

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setError('Este navegador no permite obtener la ubicación.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const punto = { lat: latitude, lng: longitude }
        setCoords(punto)
        setResultados([])
        setError('')
        describirPunto(punto)
      },
      () => setError('No se pudo obtener la ubicación actual.'),
    )
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Seleccionar ubicación en el mapa"
      subtitulo="Mueva el mapa, haga clic en el punto o busque la dirección · OpenStreetMap"
      onCerrar={onCerrar}
      ancho="max-w-3xl"
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

        {/* Mapa interactivo: se puede mover, acercar y soltar el marcador. */}
        <div
          className="h-80 overflow-hidden rounded-xl border border-slate-200"
          aria-label="Mapa interactivo para elegir la ubicación"
        >
          <MapContainer
            center={coords ? [coords.lat, coords.lng] : CENTRO_POR_DEFECTO}
            zoom={coords ? ZOOM_ACERCAMIENTO : ZOOM_POR_DEFECTO}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AjustarVista coords={coords} />
            <ClicEnMapa onCoords={fijarEnMapa} />
            {coords && (
              <Marker
                position={[coords.lat, coords.lng]}
                draggable
                eventHandlers={{
                  dragend: (e) => fijarEnMapa(e.target.getLatLng()),
                }}
              />
            )}
          </MapContainer>
        </div>

        <p className="text-xs text-slate-500">
          {coords
            ? ubicando
              ? 'Ubicando el punto en el mapa…'
              : 'Punto marcado. Arrastre el marcador o haga clic en otro lugar para ajustarlo.'
            : 'Mueva el mapa hasta la obra, haga clic en el punto exacto y la dirección se completa sola.'}
        </p>

        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onAceptar(texto, coords)}
            disabled={ubicando}
          >
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
