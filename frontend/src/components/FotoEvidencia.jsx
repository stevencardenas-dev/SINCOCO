import { useEffect, useState } from 'react'
import { incidenciasApi } from '../services/incidencias'

/** Foto adjunta a una incidencia: se pide con la sesión (el endpoint es autenticado). */
export default function FotoEvidencia({ id }) {
  const [url, setUrl] = useState(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let objeto = null
    let vivo = true
    incidenciasApi.foto(id)
      .then((blob) => { if (vivo) { objeto = URL.createObjectURL(blob); setUrl(objeto) } })
      .catch(() => vivo && setFallo(true))
    return () => { vivo = false; if (objeto) URL.revokeObjectURL(objeto) }
  }, [id])

  if (fallo) return <span className="text-xs text-slate-400">No se pudo cargar la foto</span>
  if (!url) return <span className="text-xs text-slate-400">Cargando…</span>
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Evidencia de la incidencia" className="max-h-32 rounded-lg border border-slate-200" />
    </a>
  )
}
