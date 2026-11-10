import { useEffect, useState } from 'react'
import { ChevronDoubleDownIcon, ChevronDoubleUpIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import MenuAcciones from './MenuAcciones.jsx'
import { colorEtapa } from '../lib/coloresEtapa.js'
import { fmtCOPCompacto, fmtFecha } from '../lib/format.js'

/**
 * Pestaña «Etapas»: donde se administra el plan (crear, editar, empezar,
 * reprogramar, dar de baja y reactivar). El cronograma queda solo para ver.
 *
 * Solo dibuja; las acciones y sus permisos llegan de la página:
 *  - `principalEtapa(et)`: acción destacada de la etapa («+ Actividad»).
 *  - `itemsEtapa(et)` / `itemsBaja(et)`: opciones del menú «⋯» de la etapa.
 *  - `rapidaActividad(a)` / `itemsActividad(a)`: acción destacada y menú de la actividad.
 */
// Recordatorio visual del atajo de teclado.
const Tecla = ({ children }) => (
  <kbd className="rounded border border-slate-300 bg-slate-50 px-1 font-sans text-[10px] font-bold text-slate-500">{children}</kbd>
)

export default function GestionEtapas({
  etapas,
  bajas,
  actividades,
  conIncidencia,
  estadoVisible,
  etiquetas,
  insignias,
  ordenarActividades,
  principalEtapa,
  itemsEtapa,
  itemsBaja,
  rapidaActividad,
  itemsActividad,
  onFichaActividad,
  barra,
  verBajas,
  onVerBajas,
}) {
  const [cerradas, setCerradas] = useState(() => new Set())
  // Atajos de una tecla (los mismos del cronograma): C contrae y E expande todas. No actúan
  // al escribir en un campo, con Ctrl/Alt/Cmd, ni con una ventana abierta.
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const t = e.target
      if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')) return
      if (document.querySelector('[role="dialog"]')) return
      const k = e.key.toLowerCase()
      if (k === 'c') setCerradas(new Set(etapas.map((x) => x.id)))
      else if (k === 'e') setCerradas(new Set())
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [etapas])

  const alternar = (id) =>
    setCerradas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {barra}
        <button type="button" title="Contraer todas (C)" aria-keyshortcuts="C" className="btn-ghost ml-auto !px-3 !py-1.5 text-xs" onClick={() => setCerradas(new Set(etapas.map((e) => e.id)))}>
          <ChevronDoubleUpIcon className="h-3.5 w-3.5" /> Contraer todas <Tecla>C</Tecla>
        </button>
        <button type="button" title="Expandir todas (E)" aria-keyshortcuts="E" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setCerradas(new Set())}>
          <ChevronDoubleDownIcon className="h-3.5 w-3.5" /> Expandir todas <Tecla>E</Tecla>
        </button>
        {onVerBajas && (
          <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" aria-pressed={verBajas} onClick={onVerBajas}>
            {verBajas ? 'Ocultar etapas dadas de baja' : 'Ver etapas dadas de baja'}
          </button>
        )}
      </div>

      {etapas.map((et, i) => {
        const acts = ordenarActividades(actividades.filter((a) => a.etapa_id === et.id))
        const cerrada = cerradas.has(et.id)
        const avance = Number(et.porcentaje_avance ?? 0)
        return (
          <section key={et.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ borderLeft: `5px solid ${colorEtapa(i)}` }}>
              <button
                type="button"
                onClick={() => alternar(et.id)}
                aria-expanded={!cerrada}
                aria-label={`${cerrada ? 'Expandir' : 'Contraer'} etapa ${et.nombre}`}
                className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
              >
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${cerrada ? '-rotate-90' : ''}`} />
              </button>
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-400 text-xs font-bold text-brand-950">{et.orden}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-slate-900">{et.nombre}</p>
                <p className="text-xs text-slate-500">
                  {et.fecha_inicio_programada ? fmtFecha(et.fecha_inicio_programada) : 'sin inicio'} —{' '}
                  {et.fecha_fin_programada ? fmtFecha(et.fecha_fin_programada) : 'sin fin'} ·{' '}
                  <span title="Suma del presupuesto de sus actividades">{et.presupuesto != null ? fmtCOPCompacto(et.presupuesto) : 'sin presupuesto'}</span>
                </p>
              </div>
              <div className="flex w-40 items-center gap-2" title="Promedio ponderado por el esfuerzo de cada actividad">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-accent-500" style={{ width: `${avance}%` }} />
                </div>
                <b className="w-9 text-right text-xs tabular-nums text-slate-600">{avance}%</b>
              </div>
              <span className={`badge ${insignias[et.estado] ?? 'bg-slate-100 text-slate-600'}`}>{etiquetas[et.estado] ?? et.estado}</span>
              <span className="flex items-center gap-1.5">
                {principalEtapa?.(et)}
                <MenuAcciones items={itemsEtapa(et)} etiqueta="Más acciones de la etapa" />
              </span>
            </div>

            {!cerrada &&
              (acts.length === 0 ? (
                <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Sin actividades en esta etapa.</p>
              ) : (
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="py-2 pl-5 pr-3 font-semibold">Actividad</th>
                        <th className="px-3 py-2 font-semibold">Responsable</th>
                        <th className="px-3 py-2 font-semibold">Fechas</th>
                        <th className="px-3 py-2 font-semibold">Estado</th>
                        <th className="px-3 py-2 font-semibold">Avance</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {acts.map((a) => {
                        const e = estadoVisible(a)
                        const grave = conIncidencia.has(a.id)
                        return (
                          <tr key={a.id} className={grave ? 'bg-red-50/60' : undefined}>
                            <td className="py-2.5 pl-5 pr-3 text-[13px] font-medium text-slate-800">
                              <button type="button" className="flex items-center gap-1.5 text-left hover:text-brand-700 hover:underline" title="Ver ficha de la actividad" onClick={() => onFichaActividad(a)}>
                                {a.nombre}
                                {grave && <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-600" title="Incidencia grave sin resolver" />}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-600">{a.responsable_nombre ?? '—'}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                              {fmtFecha(a.fecha_inicio_programada)} — {fmtFecha(a.fecha_fin_programada)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`badge ${insignias[e] ?? 'bg-slate-100 text-slate-600'}`}>{etiquetas[e] ?? a.estado}</span>
                            </td>
                            <td className="px-3 py-2.5 text-xs font-semibold tabular-nums text-slate-600">{Number(a.porcentaje_avance)}%</td>
                            <td className="px-3 py-2.5">
                              <span className="flex items-center justify-end gap-1.5">
                                {rapidaActividad?.(a)}
                                <MenuAcciones items={itemsActividad(a)} etiqueta="Más acciones de la actividad" />
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
          </section>
        )
      })}

      {bajas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Etapas dadas de baja</h3>
          {bajas.map((et) => (
            <section key={et.id} className="card flex flex-wrap items-center gap-3 border-dashed bg-slate-50 px-4 py-3 opacity-80">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-300 text-xs font-bold text-white">{et.orden}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-slate-700">{et.nombre}</p>
                <p className="text-xs text-slate-500">
                  {et.fecha_inicio_programada ? fmtFecha(et.fecha_inicio_programada) : 'sin inicio'} — {et.fecha_fin_programada ? fmtFecha(et.fecha_fin_programada) : 'sin fin'}
                </p>
              </div>
              <span className="badge bg-red-50 text-red-700">Dada de baja</span>
              <MenuAcciones items={itemsBaja(et)} etiqueta="Más acciones de la etapa" />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
