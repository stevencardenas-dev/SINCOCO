import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDownIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { fmtCOPCompacto, fmtFecha } from '../lib/format.js'
import { colorEtapa } from '../lib/coloresEtapa.js'

/**
 * Cronograma del plan: etapas plegables y una barra por actividad sobre una
 * línea de tiempo en meses. Al abrir, la línea de tiempo se coloca en el mes
 * actual (la línea roja marca hoy) y se recorre con el scroll horizontal.
 *
 * Solo dibuja: las acciones (editar, reprogramar, avance…) las decide la página
 * según los permisos y llegan por `accionesEtapa` y `panelActividad`.
 */

const ANCHO_ETIQUETA = 272 // columna fija de nombres (px)
const PX_DIA = 5 // escala: ~150 px por mes
const ALTO_CABECERA = 40

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MS_DIA = 86400000

// 'YYYY-MM-DD' (o ISO) -> Date local, sin correrla por la zona horaria.
const aFecha = (valor) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor ?? ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
const diasEntre = (a, b) => Math.round((b - a) / MS_DIA)
const inicioMes = (d) => new Date(d.getFullYear(), d.getMonth(), 1)

const COLOR_BARRA = {
  COMPLETADA: 'bg-emerald-500 text-white',
  EN_PROCESO: 'bg-accent-400 text-brand-950',
  PENDIENTE: 'bg-slate-300 text-slate-700',
  ATRASADA: 'bg-red-500 text-white',
  SUSPENDIDA: 'bg-orange-400 text-white',
}
const COLOR_PUNTO = {
  COMPLETADA: 'bg-emerald-500',
  EN_PROCESO: 'bg-accent-400',
  PENDIENTE: 'bg-slate-300',
  ATRASADA: 'bg-red-500',
  SUSPENDIDA: 'bg-orange-400',
}
const COLOR_ETAPA = {
  COMPLETADA: { borde: 'border-emerald-500', fondo: 'bg-emerald-50', barra: 'bg-emerald-500', num: 'bg-emerald-500 text-white' },
  EN_PROCESO: { borde: 'border-accent-500', fondo: 'bg-accent-50', barra: 'bg-accent-500', num: 'bg-accent-400 text-brand-950' },
  PENDIENTE: { borde: 'border-slate-400', fondo: 'bg-slate-100', barra: 'bg-slate-400', num: 'bg-slate-400 text-white' },
}
const ORDEN_OPCIONES = ['Actividad', 'Responsable', 'Fechas', 'Estado', 'Avance']

export default function CronogramaPlan({
  proyecto,
  etapas,
  actividades,
  conIncidencia,
  estadoVisible,
  etiquetas,
  insignias,
  accionesEtapa,
  panelActividad,
  orden,
  onOrden,
  ordenarActividades,
}) {
  const [cerradas, setCerradas] = useState(() => new Set(etapas.filter((e) => e.estado === 'COMPLETADA').map((e) => e.id)))
  const [abierta, setAbierta] = useState(null) // actividad cuyo panel está abierto
  const visor = useRef(null)
  const [anchoVisor, setAnchoVisor] = useState(0)

  // Rango de la línea de tiempo: de meses completos, e incluye siempre el mes actual.
  const hoy = useMemo(() => {
    const h = new Date()
    return new Date(h.getFullYear(), h.getMonth(), h.getDate())
  }, [])
  const rango = useMemo(() => {
    const fechas = [
      aFecha(proyecto?.fecha_inicio_programada),
      aFecha(proyecto?.fecha_fin_programada),
      ...etapas.flatMap((e) => [aFecha(e.fecha_inicio_programada), aFecha(e.fecha_fin_programada)]),
      ...actividades.flatMap((a) => [aFecha(a.fecha_inicio_programada), aFecha(a.fecha_fin_programada)]),
      hoy,
    ].filter(Boolean)
    const min = new Date(Math.min(...fechas))
    const max = new Date(Math.max(...fechas))
    const desde = inicioMes(min)
    const hasta = new Date(max.getFullYear(), max.getMonth() + 1, 1) // exclusivo
    const meses = []
    for (let d = new Date(desde); d < hasta; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const sig = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      meses.push({ d, ancho: diasEntre(d, sig) * PX_DIA })
    }
    return { desde, total: diasEntre(desde, hasta) * PX_DIA, meses }
  }, [proyecto, etapas, actividades, hoy])

  const x = (fecha) => diasEntre(rango.desde, fecha) * PX_DIA
  const xHoy = x(hoy) + PX_DIA / 2

  // Líneas de mes y marca de hoy en una sola imagen que se repite hacia abajo:
  // así cada fila las lleva sin elementos extra.
  const fondo = useMemo(() => {
    let acum = 0
    const lineas = rango.meses
      .map((m) => {
        const l = `<rect x='${acum}' y='0' width='1' height='4' fill='%23e2e8f0'/>`
        acum += m.ancho
        return l
      })
      .join('')
    const marca = `<rect x='${xHoy - 1}' y='0' width='2' height='4' fill='%23ef4444'/>`
    return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${rango.total}' height='4'>${lineas}${marca}</svg>")`
  }, [rango, xHoy])

  // El mes actual queda como primer mes visible tras la columna de nombres.
  const irAHoy = (suave = false) => {
    const el = visor.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, x(inicioMes(hoy))), behavior: suave ? 'smooth' : 'auto' })
  }
  // Espacio al final para que el mes actual pueda quedar siempre al borde izquierdo,
  // aunque falten pocos meses para terminar el proyecto.
  const relleno = Math.max(0, anchoVisor - ANCHO_ETIQUETA - (rango.total - x(inicioMes(hoy))))

  useLayoutEffect(() => {
    const el = visor.current
    if (!el) return undefined
    const medir = () => setAnchoVisor(el.clientWidth)
    medir()
    const o = new ResizeObserver(medir)
    o.observe(el)
    return () => o.disconnect()
  }, [])

  const centrado = useRef(false)
  useLayoutEffect(() => {
    // Solo la primera vez que hay medida, y de nuevo si cambia el rango (p. ej. tras reprogramar).
    if (!anchoVisor) return
    irAHoy()
    centrado.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango.total, anchoVisor > 0, relleno > 0])

  useEffect(() => {
    if (!abierta) return undefined
    const alTeclear = (e) => e.key === 'Escape' && setAbierta(null)
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierta])

  const alternar = (id) =>
    setCerradas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const barra = (inicio, fin) => {
    const i = aFecha(inicio)
    const f = aFecha(fin)
    if (!i || !f) return null
    return { left: x(i), width: Math.max(diasEntre(i, f) * PX_DIA + PX_DIA, 28) }
  }

  const abiertaActual = abierta ? actividades.find((a) => a.id === abierta) : null
  const celda = { backgroundImage: fondo, backgroundSize: `${rango.total}px 4px`, backgroundRepeat: 'repeat-y', width: rango.total }

  return (
    <div className="space-y-3">
      {/* Controles del cronograma */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => irAHoy(true)}>
          Ir a hoy
        </button>
        <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setCerradas(new Set(etapas.map((e) => e.id)))}>
          Contraer todas
        </button>
        <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setCerradas(new Set())}>
          Expandir todas
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <label htmlFor="orden-actividades" className="font-medium">Ordenar actividades por</label>
          <select
            id="orden-actividades"
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
            value={orden?.titulo ?? ''}
            onChange={(e) => onOrden(e.target.value ? { titulo: e.target.value, desc: orden?.desc ?? false } : null)}
          >
            <option value="">Orden del plan</option>
            {ORDEN_OPCIONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {orden && (
            <button type="button" className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => onOrden({ ...orden, desc: !orden.desc })}>
              {orden.desc ? 'Descendente' : 'Ascendente'}
            </button>
          )}
        </div>
      </div>

      <div ref={visor} className="card relative max-h-[72vh] overflow-auto" data-testid="cronograma">
        <div style={{ width: ANCHO_ETIQUETA + rango.total + relleno }}>
          {/* Cabecera de meses */}
          <div className="sticky top-0 z-40 flex border-b border-slate-200 bg-slate-50" style={{ height: ALTO_CABECERA }}>
            <div
              className="sticky left-0 z-50 flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-4 text-xs font-bold uppercase tracking-wide text-slate-500"
              style={{ width: ANCHO_ETIQUETA }}
            >
              Etapa / actividad
            </div>
            <div className="flex" style={{ width: rango.total }}>
              {rango.meses.map((m) => {
                const actual = m.d.getTime() === inicioMes(hoy).getTime()
                return (
                  <div
                    key={m.d.getTime()}
                    style={{ width: m.ancho }}
                    className={`shrink-0 border-l border-slate-200 px-2 py-2.5 text-[11px] font-semibold uppercase ${actual ? 'bg-accent-100 text-brand-900' : 'text-slate-500'}`}
                  >
                    {MESES[m.d.getMonth()]} {m.d.getMonth() === 0 || m.d === rango.meses[0].d ? m.d.getFullYear() : ''}
                    {actual && <span className="ml-1.5 rounded bg-red-500 px-1 text-[9px] text-white">HOY</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {etapas.map((et, i) => {
            const acts = ordenarActividades(actividades.filter((a) => a.etapa_id === et.id))
            const cerrada = cerradas.has(et.id)
            const col = COLOR_ETAPA[et.estado] ?? COLOR_ETAPA.PENDIENTE
            const b = barra(et.fecha_inicio_programada, et.fecha_fin_programada)
            const avance = Number(et.porcentaje_avance ?? 0)
            return (
              <div key={et.id}>
                {/* Fila de la etapa: queda fija arriba mientras se recorren sus actividades. */}
                <div className={`sticky z-30 flex border-b border-t border-slate-200 ${col.fondo}`} style={{ top: ALTO_CABECERA }}>
                  <div
                    className={`sticky left-0 z-40 shrink-0 border-l-4 px-3 py-2.5 ${col.borde} ${col.fondo}`}
                    style={{ width: ANCHO_ETIQUETA }}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => alternar(et.id)}
                        aria-expanded={!cerrada}
                        aria-label={`${cerrada ? 'Expandir' : 'Contraer'} etapa ${et.nombre}`}
                        title={cerrada ? 'Expandir' : 'Contraer'}
                        className="mt-0.5 rounded-lg bg-black/5 p-1 text-slate-600 hover:bg-black/10"
                      >
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${cerrada ? '-rotate-90' : ''}`} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${col.num}`}>{et.orden}</span>
                          <p className="min-w-0 break-words text-sm font-semibold leading-5 text-slate-900" title={et.nombre}>{et.nombre}</p>
                        </div>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-600">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorEtapa(i) }} title="Color en el presupuesto" />
                          <span>{acts.length} {acts.length === 1 ? 'actividad' : 'actividades'}</span>
                          <span>· {avance}%</span>
                          <span title="Suma del presupuesto de sus actividades">· {et.presupuesto != null ? fmtCOPCompacto(et.presupuesto) : 'sin presupuesto'}</span>
                        </p>
                        <div className="mt-1.5">
                          <span className={`badge ${insignias[et.estado] ?? 'bg-slate-100 text-slate-600'}`}>{etiquetas[et.estado] ?? et.estado}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">{accionesEtapa(et)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="relative" style={{ ...celda, minHeight: 44, backgroundColor: 'transparent' }}>
                    {b ? (
                      <div
                        className={`absolute top-1/2 h-3.5 -translate-y-1/2 overflow-hidden rounded-full bg-black/10`}
                        style={{ left: b.left, width: b.width }}
                        title={`${fmtFecha(et.fecha_inicio_programada)} — ${fmtFecha(et.fecha_fin_programada)} · ${avance}%`}
                      >
                        <div className={`h-full ${col.barra}`} style={{ width: `${avance}%` }} />
                      </div>
                    ) : (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Sin fechas definidas</span>
                    )}
                  </div>
                </div>

                {!cerrada && acts.length === 0 && (
                  <div className="flex border-b border-slate-100">
                    <div className="sticky left-0 z-20 shrink-0 bg-white px-5 py-3 text-xs text-slate-400" style={{ width: ANCHO_ETIQUETA }}>
                      Sin actividades en esta etapa.
                    </div>
                    <div style={celda} />
                  </div>
                )}

                {!cerrada &&
                  acts.map((a) => {
                    const estado = estadoVisible(a)
                    const bar = barra(a.fecha_inicio_programada, a.fecha_fin_programada)
                    const grave = conIncidencia.has(a.id)
                    const fila = grave ? 'bg-red-50' : 'bg-white'
                    return (
                      <div
                        key={a.id}
                        className={`group flex cursor-pointer border-b border-slate-100 hover:bg-accent-50 ${abierta === a.id ? 'bg-accent-100' : ''}`}
                        onClick={() => setAbierta(a.id)}
                      >
                        <div
                          className={`sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-slate-100 px-3 py-2.5 group-hover:bg-accent-50 ${abierta === a.id ? 'bg-accent-100' : fila}`}
                          style={{ width: ANCHO_ETIQUETA }}
                        >
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_PUNTO[estado] ?? 'bg-slate-300'}`} title={etiquetas[estado]} />
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              className="block w-full break-words text-left text-[13px] font-medium leading-5 text-slate-800"
                              title="Ver acciones de la actividad"
                              onClick={(e) => { e.stopPropagation(); setAbierta(a.id) }}
                            >
                              {a.nombre}
                            </button>
                            <p className="truncate text-[11px] text-slate-500">{a.responsable_nombre ?? 'Sin responsable'}</p>
                          </div>
                          {grave && <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-600" title="Incidencia grave sin resolver" aria-label="Incidencia grave sin resolver" />}
                        </div>
                        <div className="relative" style={{ ...celda, minHeight: 50 }}>
                          {bar && (
                            <div
                              className={`absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-lg border border-black/5 px-2 text-[11px] font-bold ${COLOR_BARRA[estado] ?? COLOR_BARRA.PENDIENTE} ${grave ? 'ring-2 ring-red-400' : ''}`}
                              style={{ left: bar.left, width: bar.width }}
                              title={`${a.nombre} · ${fmtFecha(a.fecha_inicio_programada)} — ${fmtFecha(a.fecha_fin_programada)} · ${Number(a.porcentaje_avance)}%`}
                            >
                              <span className="absolute inset-y-0 left-0 bg-black/20" style={{ width: `${Number(a.porcentaje_avance)}%` }} />
                              <span className="relative whitespace-nowrap">{Number(a.porcentaje_avance)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Panel de la actividad: sus datos y todas sus acciones. */}
      {abiertaActual && (
        <div className="fixed inset-0 z-40" role="dialog" aria-label={`Actividad ${abiertaActual.nombre}`}>
          <div className="absolute inset-0 bg-slate-900/35" onClick={() => setAbierta(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <header className="bg-brand-900 p-5 text-white">
              <button type="button" onClick={() => setAbierta(null)} className="float-right rounded-lg bg-white/10 p-1.5 hover:bg-white/20" aria-label="Cerrar">
                <XMarkIcon className="h-4 w-4" />
              </button>
              <p className="text-xs text-slate-300">
                Etapa {etapas.find((e) => e.id === abiertaActual.etapa_id)?.orden} · {etapas.find((e) => e.id === abiertaActual.etapa_id)?.nombre}
              </p>
              <h3 className="mb-3 mt-1 text-lg font-bold leading-snug">{abiertaActual.nombre}</h3>
              <span className={`badge ${insignias[estadoVisible(abiertaActual)] ?? 'bg-slate-100 text-slate-600'}`}>
                {etiquetas[estadoVisible(abiertaActual)] ?? abiertaActual.estado}
              </span>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">
                  <span>Avance</span>
                  <span>{Number(abiertaActual.porcentaje_avance)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${estadoVisible(abiertaActual) === 'ATRASADA' ? 'bg-red-500' : 'bg-accent-500'}`}
                    style={{ width: `${Number(abiertaActual.porcentaje_avance)}%` }}
                  />
                </div>
              </div>
              {conIncidencia.has(abiertaActual.id) && (
                <Link to="/incidencias" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 hover:bg-red-100">
                  <ExclamationTriangleIcon className="h-5 w-5" /> Tiene una incidencia grave sin resolver
                </Link>
              )}
              <dl className="grid grid-cols-2 gap-2.5 text-sm">
                {[
                  ['Responsable', abiertaActual.responsable_nombre ?? 'Sin asignar'],
                  ['Esfuerzo', abiertaActual.esfuerzo ? abiertaActual.esfuerzo[0] + abiertaActual.esfuerzo.slice(1).toLowerCase() : '—'],
                  ['Inicio', fmtFecha(abiertaActual.fecha_inicio_programada)],
                  ['Fin programado', fmtFecha(abiertaActual.fecha_fin_programada)],
                ].map(([t, v]) => (
                  <div key={t} className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-[11px] text-slate-500">{t}</dt>
                    <dd className="font-semibold text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="grid gap-2">{panelActividad(abiertaActual, () => setAbierta(null))}</div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
