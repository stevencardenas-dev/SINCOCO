import { useEffect, useState } from 'react'
import { evidenciasApi, archivoABase64 } from '../services/evidencias'
import { mensajeError } from '../lib/errores'
import { fmtFechaHora } from '../lib/format.js'

/**
 * HU-22 · evidencias de la actividad.
 *
 * Se adjuntan JPG, PNG, WEBP o PDF de hasta 3 MB sobre el último corte de
 * avance; la lista muestra tipo, fecha, quién la subió y deja abrirla o
 * eliminarla. Los límites los valida el backend, aquí solo se avisan.
 */
const MAXIMO = 3 * 1024 * 1024
const ACEPTADOS = '.jpg,.jpeg,.png,.webp,.pdf'
const CATEGORIAS = ['FOTO', 'PLANO', 'ACTA', 'OTRO']

const peso = (bytes) => {
  const n = Number(bytes ?? 0)
  return n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}

export default function EvidenciasAvance({ actividadId, onCambio }) {
  const [evidencias, setEvidencias] = useState(null)
  const [categoria, setCategoria] = useState('FOTO')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => {
    evidenciasApi
      .deActividad(actividadId)
      .then((r) => setEvidencias(r.evidencias ?? []))
      .catch(() => setEvidencias([]))
  }

  useEffect(() => {
    setEvidencias(null)
    setError('')
    cargar()
  }, [actividadId])

  const adjuntar = async (evento) => {
    const archivos = [...(evento.target.files ?? [])]
    evento.target.value = ''
    if (archivos.length === 0) return
    setError('')
    for (const archivo of archivos) {
      if (archivo.size > MAXIMO) {
        setError(`${archivo.name} supera el máximo de 3 MB.`)
        return
      }
    }
    setSubiendo(true)
    try {
      for (const archivo of archivos) {
        await evidenciasApi.subir({
          actividad_id: actividadId,
          nombre_archivo: archivo.name,
          tipo_archivo: archivo.type,
          categoria,
          contenido: await archivoABase64(archivo),
        })
      }
      cargar()
      onCambio?.()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo adjuntar la evidencia.'))
    } finally {
      setSubiendo(false)
    }
  }

  const eliminar = async (evidencia) => {
    if (!window.confirm(`¿Eliminar ${evidencia.nombre_archivo}?`)) return
    try {
      await evidenciasApi.eliminar(evidencia.id)
      cargar()
      onCambio?.()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar la evidencia.'))
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label mb-0">Evidencias de avance</p>
        <div className="flex items-center gap-2">
          <select className="input h-8 py-0 text-xs" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <label className={`btn-ghost text-xs ${subiendo ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
            {subiendo ? 'Subiendo…' : 'Adjuntar'}
            <input type="file" className="sr-only" accept={ACEPTADOS} multiple onChange={adjuntar} disabled={subiendo} />
          </label>
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP o PDF · máximo 3 MB por archivo.</p>

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      {evidencias === null ? (
        <p className="mt-2 text-sm text-slate-500">Cargando evidencias…</p>
      ) : evidencias.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          Todavía no hay evidencias. Se adjuntan sobre el último corte de avance.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-sm">
          {evidencias.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <a
                  href={evidenciasApi.urlArchivo(e.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-medium text-brand-700 hover:underline"
                >
                  {e.nombre_archivo}
                </a>
                <p className="text-xs text-slate-500">
                  {e.categoria ?? 'FOTO'} · {peso(e.tamano_bytes)} · {e.subido_por} · {fmtFechaHora(e.subido_en)}
                </p>
              </div>
              <button type="button" className="btn-accion btn-accion-peligro" onClick={() => eliminar(e)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
