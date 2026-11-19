import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { evidenciasApi } from '../services/evidencias'
import { fmtFechaHora } from '../lib/format.js'

/**
 * HU-22 · últimas evidencias de avance del conjunto de proyectos.
 *
 * El dashboard muestra qué se documentó en obra recientemente, con acceso al
 * archivo y al proyecto donde se registró.
 */
export default function EvidenciasRecientes() {
  const [evidencias, setEvidencias] = useState(null)

  useEffect(() => {
    evidenciasApi
      .recientes(6)
      .then((r) => setEvidencias(r.evidencias ?? []))
      .catch(() => setEvidencias([]))
  }, [])

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title mb-0">Evidencias recientes</h2>
        <span className="text-xs text-slate-500">Fotos y documentos de avance</span>
      </div>

      {evidencias === null ? (
        <p className="mt-3 text-sm text-slate-500">Cargando…</p>
      ) : evidencias.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Aún no hay evidencias adjuntas. Se cargan al registrar el avance de una actividad.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {evidencias.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <a
                  href={evidenciasApi.urlArchivo(e.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-brand-700 hover:underline"
                >
                  {e.nombre_archivo}
                </a>
                <p className="truncate text-xs text-slate-500">
                  {e.actividad_nombre} · {fmtFechaHora(e.subido_en)}
                </p>
              </div>
              <Link to={`/proyectos/${e.proyecto_id}`} className="shrink-0 text-xs text-slate-500 hover:underline">
                {e.proyecto_nombre}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
