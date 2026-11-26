import { useEffect, useState } from 'react'
import { ArrowPathIcon, CheckIcon, PlusIcon, TruckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { serviciosExternosApi, proveedoresApi } from '../services/serviciosExternos'
import { proyectosApi } from '../services/proyectos'
import { actividadesApi } from '../services/actividades'
import { useRecurso } from '../hooks/useRecurso'
import { useFormulario } from '../hooks/useFormulario'
import { fmtCOP, fmtFecha, fmtMiles, soloDigitos, montoEnPalabras } from '../lib/format.js'
import SelectBuscable from '../components/SelectBuscable.jsx'

/**
 * HU-28 (CU-28): servicios externos contratados a un proveedor, con su
 * proyecto, actividad, responsable externo, fechas y valor contratado.
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - proveedor, proyecto y actividad son obligatorios (criterio 1);
 *   - fechas de inicio y fin y valor contratado son obligatorios (criterio 2);
 *   - el valor suma al costo de servicios del proyecto (criterio 3);
 *   - HU-32: si el valor supera el presupuesto disponible de la actividad, el
 *     servicio queda pendiente de autorización, se notifica al gerente y no suma
 *     a la consolidación hasta que se autorice. El gerente puede autorizarlo o
 *     rechazarlo con una observación; el administrador reajusta el monto y el
 *     sistema lo vuelve a evaluar.
 */

const VACIO = {
  proveedor_id: '',
  proyecto_id: '',
  actividad_id: '',
  nombre_servicio: '',
  responsable_externo: '',
  fecha_inicio: '',
  fecha_fin: '',
  valor_contratado: '',
  descripcion: '',
}

// 13 dígitos enteros: el valor es decimal(15,2).
const MAX_DIGITOS = 13

const ESTADOS = {
  PROGRAMADO: { label: 'Programado', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  EN_EJECUCION: { label: 'En ejecución', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  FINALIZADO: { label: 'Finalizado', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  CANCELADO: { label: 'Cancelado', cls: 'bg-red-50 text-red-700 ring-red-200' },
}

const AUTORIZACION = {
  NO_REQUIERE: { label: 'Dentro del presupuesto', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  PENDIENTE: { label: 'Pendiente de autorización', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  AUTORIZADA: { label: 'Autorizado', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RECHAZADA: { label: 'Rechazado para reajuste', cls: 'bg-red-50 text-red-700 ring-red-200' },
}

export default function ServiciosExternos({ pestanas }) {
  const { puede } = useAuth()
  const puedeCrear = puede('servicios_externos.crear')
  const puedeDecidir = puede('servicios_externos.autorizar')

  const [proyectos, setProyectos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [actividades, setActividades] = useState([])
  const [filtroProyecto, setFiltroProyecto] = useState('')

  // HU-32: decisión del gerente (autorizar o rechazar) y reajuste del administrador.
  const [decision, setDecision] = useState(null)
  const [observacion, setObservacion] = useState('')
  const [reajuste, setReajuste] = useState(null)
  const [nuevoValor, setNuevoValor] = useState('')

  const { datos: servicios, error, aviso, setAviso, recargar, ejecutar } = useRecurso(
    () => serviciosExternosApi.listar({ proyecto_id: filtroProyecto }),
    [filtroProyecto],
    { mensaje: 'No se pudieron cargar los servicios externos.' },
  )

  useEffect(() => {
    proyectosApi.listar().then(setProyectos).catch(() => {})
    if (puedeCrear) proveedoresApi.listar().then(setProveedores).catch(() => {})
  }, [puedeCrear])

  const formulario = useFormulario(VACIO, {
    enviar: (f) =>
      serviciosExternosApi.crear({
        ...f,
        valor_contratado: Number(soloDigitos(f.valor_contratado) || 0),
      }),
    alGuardar: (res) => {
      const s = res.servicio
      setAviso(
        s.autorizacion_estado === 'PENDIENTE'
          ? `${s.nombre_servicio} quedó pendiente de autorización: excede el presupuesto de la actividad en ${fmtCOP(s.exceso_presupuesto)}. Se notificó al gerente.`
          : `${s.nombre_servicio} registrado con ${s.proveedor_nombre}.`,
      )
      return recargar()
    },
    error: 'No se pudo registrar el servicio externo.',
  })
  const form = formulario.valores
  const campo = formulario.claseCampo

  const abrir = () => {
    setActividades([])
    setAviso('')
    formulario.abrir()
  }
  const cambiar = (nombre, valor) => formulario.cambiar(nombre, valor)
  const elegirProyecto = (proyectoId) => {
    cambiar('proyecto_id', proyectoId)
    cambiar('actividad_id', '')
    setActividades([])
    if (proyectoId) actividadesApi.listar({ proyecto_id: proyectoId }).then(setActividades).catch(() => {})
  }

  const abrirDecision = (servicio, accion) => {
    setDecision({ servicio, accion })
    setObservacion('')
  }
  const cerrarDecision = () => {
    setDecision(null)
    setObservacion('')
  }
  const confirmarDecision = async () => {
    const { servicio, accion } = decision
    const exito = accion === 'autorizar' ? 'Servicio autorizado: ya suma a los costos del proyecto.' : 'Servicio rechazado: el administrador debe reajustar el monto.'
    const ok = await ejecutar(
      () =>
        accion === 'autorizar'
          ? serviciosExternosApi.autorizar(servicio.id, { observacion })
          : serviciosExternosApi.rechazar(servicio.id, { observacion }),
      { exito, error: 'No se pudo registrar la decisión.' },
    )
    if (ok) cerrarDecision()
  }

  const abrirReajuste = (servicio) => {
    setReajuste(servicio)
    setNuevoValor(String(Math.round(Number(servicio.valor_contratado))))
  }
  const cerrarReajuste = () => {
    setReajuste(null)
    setNuevoValor('')
  }
  const guardarReajuste = async (e) => {
    e.preventDefault()
    const valor = Number(soloDigitos(nuevoValor) || 0)
    const ok = await ejecutar(
      () => serviciosExternosApi.reajustar(reajuste.id, { valor_contratado: valor }),
      {
        exito: (res) =>
          res.servicio.autorizacion_estado === 'PENDIENTE'
            ? 'Valor reajustado; sigue excediendo el presupuesto y vuelve a quedar pendiente de autorización.'
            : 'Valor reajustado: el servicio quedó confirmado dentro del presupuesto.',
        error: 'No se pudo reajustar el valor.',
      },
    )
    if (ok) cerrarReajuste()
  }

  const valorNumero = Number(soloDigitos(form.valor_contratado) || 0)
  const actividadElegida = actividades.find((a) => String(a.id) === String(form.actividad_id))
  const totalVigente = (servicios ?? [])
    .filter((s) => s.estado !== 'CANCELADO' && ['NO_REQUIERE', 'AUTORIZADA'].includes(s.autorizacion_estado))
    .reduce((suma, s) => suma + s.valor_contratado, 0)
  const pendientes = (servicios ?? []).filter((s) => s.autorizacion_estado === 'PENDIENTE').length

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={recargar} />}
        title="Servicios externos"
        subtitle="Servicios externos contratados: responsable, fechas y valor pactado con el proveedor"
      >
        {puedeCrear && (
          <button className="btn-primary" onClick={abrir}>
            <PlusIcon className="h-5 w-5" /> Nuevo servicio
          </button>
        )}
      </PageHeader>
      {pestanas}

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      <div className="card flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-[14rem]">
          <label htmlFor="se-filtro" className="label">Proyecto</label>
          <SelectBuscable
            id="se-filtro"
            className="input"
            value={filtroProyecto}
            onChange={(e) => setFiltroProyecto(e.target.value)}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
            ))}
          </SelectBuscable>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          {pendientes > 0 && (
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Por autorizar</p>
              <p className="text-xl font-bold tabular-nums text-amber-700">{pendientes}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Costo en servicios externos (vigentes)
            </p>
            <p className="text-xl font-bold tabular-nums text-brand-900">{fmtCOP(totalVigente)}</p>
          </div>
        </div>
      </div>

      {puedeCrear && (
        <ModalFormulario
          {...formulario.propsModal}
          onCerrar={formulario.cerrar}
          titulo="Registrar servicio externo"
          subtitulo="El valor se suma al costo de servicios del proyecto"
          ancho="max-w-3xl"
          textoGuardar="Registrar servicio"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="se-proveedor" className="label">Proveedor</label>
              <SelectBuscable id="se-proveedor" className={campo('proveedor_id')} value={form.proveedor_id} required
                onChange={(e) => cambiar('proveedor_id', e.target.value)}>
                <option value="">Seleccione un proveedor…</option>
                {proveedores.filter((p) => p.estado === 'ACTIVO').map((p) => (
                  <option key={p.id} value={p.id}>{p.razon_social}</option>
                ))}
              </SelectBuscable>
            </div>
            <div>
              <label htmlFor="se-nombre" className="label">Servicio</label>
              <input id="se-nombre" maxLength={150} className={campo('nombre_servicio')} value={form.nombre_servicio} required
                placeholder="Ej. Alquiler de retroexcavadora"
                onChange={(e) => cambiar('nombre_servicio', e.target.value)} />
            </div>
            <div>
              <label htmlFor="se-proyecto" className="label">Proyecto</label>
              <SelectBuscable id="se-proyecto" className={campo('proyecto_id')} value={form.proyecto_id} required
                onChange={(e) => elegirProyecto(e.target.value)}>
                <option value="">Seleccione un proyecto…</option>
                {proyectos
                  .filter((p) => p.estado !== 'FINALIZADO' && p.estado !== 'CANCELADO')
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
                  ))}
              </SelectBuscable>
            </div>
            <div>
              <label htmlFor="se-actividad" className="label">Actividad</label>
              <SelectBuscable id="se-actividad" className={campo('actividad_id')} value={form.actividad_id} required
                disabled={!form.proyecto_id} onChange={(e) => cambiar('actividad_id', e.target.value)}>
                <option value="">{form.proyecto_id ? 'Seleccione una actividad…' : 'Elija primero el proyecto'}</option>
                {actividades.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </SelectBuscable>
              {actividadElegida && (
                <p className="mt-1 text-xs text-slate-500">
                  {actividadElegida.presupuesto === null
                    ? 'Esta actividad no tiene presupuesto definido: no se validará el valor.'
                    : `Presupuesto de la actividad: ${fmtCOP(actividadElegida.presupuesto)}`}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="se-responsable" className="label">Responsable externo</label>
              <input id="se-responsable" maxLength={100} className={campo('responsable_externo')} value={form.responsable_externo} required
                placeholder="Persona del proveedor a cargo del servicio"
                onChange={(e) => cambiar('responsable_externo', e.target.value)} />
            </div>
            <div>
              <label htmlFor="se-inicio" className="label">Fecha de inicio</label>
              <input id="se-inicio" type="date" className={campo('fecha_inicio')} value={form.fecha_inicio} required
                max={form.fecha_fin || undefined} onChange={(e) => cambiar('fecha_inicio', e.target.value)} />
            </div>
            <div>
              <label htmlFor="se-fin" className="label">Fecha de fin</label>
              <input id="se-fin" type="date" className={campo('fecha_fin')} value={form.fecha_fin} required
                min={form.fecha_inicio || undefined} onChange={(e) => cambiar('fecha_fin', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="se-valor" className="label">Valor contratado (COP)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">$</span>
                <input id="se-valor" type="text" inputMode="numeric" autoComplete="off" placeholder="4.000.000" required
                  className={`${campo('valor_contratado')} pl-8 tabular-nums`}
                  value={fmtMiles(form.valor_contratado)}
                  onChange={(e) => cambiar('valor_contratado', soloDigitos(e.target.value).slice(0, MAX_DIGITOS))} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {valorNumero > 0
                  ? `${fmtCOP(valorNumero)} · ${montoEnPalabras(form.valor_contratado)}`
                  : 'Escriba el monto en pesos, sin puntos: se separan solos.'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="se-descripcion" className="label">Descripción (opcional)</label>
              <textarea id="se-descripcion" rows={2} className={campo('descripcion')} value={form.descripcion}
                onChange={(e) => cambiar('descripcion', e.target.value)} />
            </div>
          </div>

          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200">
            Si el valor supera el presupuesto disponible de la actividad, el servicio se guarda como
            <strong> pendiente de autorización</strong>: el gerente recibe la notificación con el detalle del
            exceso y decide si lo autoriza o lo devuelve para reajustar el monto.
          </p>
        </ModalFormulario>
      )}

      {/* HU-32: autorizar o rechazar el sobrecosto. */}
      {decision && (
        <Modal
          abierto
          onCerrar={cerrarDecision}
          titulo={decision.accion === 'autorizar' ? 'Autorizar el sobrecosto' : 'Rechazar para reajuste'}
          subtitulo={`${decision.servicio.nombre_servicio} · ${decision.servicio.proveedor_nombre}`}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm tabular-nums">
            <dt className="text-slate-500">Proyecto · actividad</dt>
            <dd className="text-right text-slate-800">
              {decision.servicio.proyecto_codigo} · {decision.servicio.actividad_nombre ?? 'Sin actividad'}
            </dd>
            <dt className="text-slate-500">Valor contratado</dt>
            <dd className="text-right text-slate-800">{fmtCOP(decision.servicio.valor_contratado)}</dd>
            <dt className="text-slate-500">Exceso</dt>
            <dd className="text-right font-semibold text-rose-700">{fmtCOP(decision.servicio.exceso_presupuesto)}</dd>
          </dl>

          <label htmlFor="se-observacion" className="label mt-4">
            Observación {decision.accion === 'rechazar' ? '(obligatoria)' : '(opcional)'}
          </label>
          <textarea
            id="se-observacion"
            rows={3}
            className="input"
            value={observacion}
            maxLength={500}
            placeholder={
              decision.accion === 'rechazar'
                ? 'Explique al administrador cómo debe reajustar el monto'
                : 'Nota para la bitácora'
            }
            onChange={(e) => setObservacion(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={decision.accion === 'autorizar' ? 'btn-primary' : 'btn-primary bg-rose-600 hover:bg-rose-700'}
              disabled={decision.accion === 'rechazar' && !observacion.trim()}
              onClick={confirmarDecision}
            >
              {decision.accion === 'autorizar' ? (
                <><CheckIcon className="h-5 w-5" /> Autorizar servicio</>
              ) : (
                <><XMarkIcon className="h-5 w-5" /> Rechazar para reajuste</>
              )}
            </button>
            <button type="button" className="btn-ghost" onClick={cerrarDecision}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* HU-32: reajuste del administrador tras un rechazo. */}
      {reajuste && (
        <Modal
          abierto
          onCerrar={cerrarReajuste}
          titulo="Reajustar el valor del servicio"
          subtitulo={`${reajuste.nombre_servicio} · ${reajuste.proveedor_nombre}`}
        >
          <form onSubmit={guardarReajuste} className="space-y-4">
            {reajuste.observacion_autorizacion && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <strong>Observación del gerente:</strong> {reajuste.observacion_autorizacion}
              </p>
            )}
            <div>
              <label htmlFor="se-nuevo-valor" className="label">Nuevo valor contratado (COP)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">$</span>
                <input
                  id="se-nuevo-valor"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  className="input pl-8 tabular-nums"
                  value={fmtMiles(nuevoValor)}
                  onChange={(e) => setNuevoValor(soloDigitos(e.target.value).slice(0, MAX_DIGITOS))}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Al guardar, el valor se vuelve a comparar con el presupuesto de la actividad. Si ya cabe, el
                servicio queda confirmado; si no, sigue pendiente de autorización.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={!Number(soloDigitos(nuevoValor) || 0)}>
                Guardar nuevo valor
              </button>
              <button type="button" className="btn-ghost" onClick={cerrarReajuste}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {servicios === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando servicios…
        </div>
      )}

      {servicios !== null && servicios.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <TruckIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay servicios externos registrados</p>
        </div>
      )}

      {servicios !== null && servicios.length > 0 && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={servicios}
            minWidth="md:min-w-[980px]"
            filaClase={() => 'transition hover:bg-slate-50/70'}
            ficha={{ titulo: (s) => s.nombre_servicio, subtitulo: (s) => s.proveedor_nombre }}
            columnas={[
              {
                titulo: 'Servicio',
                movil: true,
                tdClase: 'text-slate-700',
                celda: (s) => (
                  <>
                    <span className="font-medium text-slate-800">{s.nombre_servicio}</span>
                    <span className="block text-xs text-slate-400">{s.proveedor_nombre}</span>
                  </>
                ),
              },
              {
                titulo: 'Proyecto · actividad',
                tdClase: 'text-slate-600',
                celda: (s) => (
                  <>
                    {s.proyecto_codigo}
                    <span className="block text-xs text-slate-400">{s.actividad_nombre ?? 'Sin actividad'}</span>
                  </>
                ),
              },
              { titulo: 'Responsable externo', tdClase: 'text-slate-600', celda: (s) => s.responsable_externo },
              {
                titulo: 'Fechas',
                tdClase: 'text-slate-600',
                celda: (s) => `${fmtFecha(s.fecha_inicio)} → ${s.fecha_fin ? fmtFecha(s.fecha_fin) : '—'}`,
              },
              {
                titulo: 'Valor contratado',
                movil: true,
                tdClase: 'tabular-nums font-medium text-slate-800',
                celda: (s) => fmtCOP(s.valor_contratado),
              },
              {
                titulo: 'Estado',
                celda: (s) => {
                  const e = ESTADOS[s.estado] ?? { label: s.estado, cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
                  return <span className={`badge ring-1 ${e.cls}`}>{e.label}</span>
                },
              },
              {
                titulo: 'Autorización',
                movil: true,
                celda: (s) => {
                  const a = AUTORIZACION[s.autorizacion_estado] ?? {
                    label: s.autorizacion_estado,
                    cls: 'bg-slate-100 text-slate-600 ring-slate-200',
                  }
                  return (
                    <>
                      <span className={`badge ring-1 ${a.cls}`}>{a.label}</span>
                      {s.autorizacion_estado === 'PENDIENTE' && Number(s.exceso_presupuesto) > 0 && (
                        <span className="mt-1 block text-xs font-medium text-amber-700">
                          Exceso: {fmtCOP(s.exceso_presupuesto)}
                        </span>
                      )}
                      {s.autorizacion_estado === 'RECHAZADA' && s.observacion_autorizacion && (
                        <span className="mt-1 block text-xs text-slate-500">{s.observacion_autorizacion}</span>
                      )}
                    </>
                  )
                },
              },
              {
                titulo: 'Acciones',
                acciones: true,
                celda: (s, enFicha) => {
                  const botones = [
                    puedeDecidir && s.autorizacion_estado === 'PENDIENTE' ? (
                      <button
                        key="autorizar"
                        className="btn-accion btn-accion-ok"
                        onClick={() => abrirDecision(s, 'autorizar')}
                      >
                        <CheckIcon className="h-4 w-4" /> Autorizar
                      </button>
                    ) : null,
                    puedeDecidir && s.autorizacion_estado === 'PENDIENTE' ? (
                      <button
                        key="rechazar"
                        className="btn-accion btn-accion-peligro"
                        onClick={() => abrirDecision(s, 'rechazar')}
                      >
                        <XMarkIcon className="h-4 w-4" /> Rechazar
                      </button>
                    ) : null,
                    puedeCrear && ['PENDIENTE', 'RECHAZADA'].includes(s.autorizacion_estado) ? (
                      <button
                        key="reajustar"
                        className="btn-accion btn-accion-editar"
                        onClick={() => abrirReajuste(s)}
                      >
                        Reajustar valor
                      </button>
                    ) : null,
                  ].filter(Boolean)
                  if (botones.length === 0) return null
                  return enFicha ? botones : (
                    <div className="-my-1 flex flex-col items-stretch gap-1.5">{botones}</div>
                  )
                },
              },
            ]}
          />
        </div>
      )}

      <p className="text-xs text-slate-500">
        Un servicio pendiente de autorización todavía no suma a la consolidación de costos del proyecto. Al
        autorizarse, entra en el siguiente corte de costos.
      </p>
    </div>
  )
}
