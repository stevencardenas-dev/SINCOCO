import { useEffect, useRef, useState } from 'react'
import { ArrowPathIcon, PlusIcon, TruckIcon } from '@heroicons/react/24/outline'
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

/**
 * HU-28 (CU-28): servicios externos contratados a un proveedor, con su
 * proyecto, actividad, responsable externo, fechas y valor contratado.
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - proveedor, proyecto y actividad son obligatorios (criterio 1);
 *   - fechas de inicio y fin y valor contratado son obligatorios (criterio 2);
 *   - el valor suma al costo de servicios del proyecto (criterio 3);
 *   - si el valor supera el presupuesto disponible de la actividad, el servidor
 *     advierte (409) y el servicio solo se guarda si el administrador confirma (criterio 4).
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

export default function ServiciosExternos() {
  const { puede } = useAuth()
  const puedeCrear = puede('servicios_externos.crear')

  const [proyectos, setProyectos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [actividades, setActividades] = useState([])
  const [filtroProyecto, setFiltroProyecto] = useState('')
  // Detalle de la advertencia de presupuesto (respuesta 409) y confirmación del administrador.
  const [exceso, setExceso] = useState(null)
  const confirmado = useRef(false)

  const { datos: servicios, error, aviso, setAviso, recargar } = useRecurso(
    () => serviciosExternosApi.listar({ proyecto_id: filtroProyecto }),
    [filtroProyecto],
    { mensaje: 'No se pudieron cargar los servicios externos.' },
  )

  useEffect(() => {
    proyectosApi.listar().then(setProyectos).catch(() => {})
    if (puedeCrear) proveedoresApi.listar().then(setProveedores).catch(() => {})
  }, [puedeCrear])

  const formulario = useFormulario(VACIO, {
    enviar: async (f) => {
      const cuerpo = {
        ...f,
        valor_contratado: Number(soloDigitos(f.valor_contratado) || 0),
        confirmar_exceso: confirmado.current,
      }
      try {
        return await serviciosExternosApi.crear(cuerpo)
      } catch (err) {
        const d = err?.response?.data
        if (d?.codigo === 'EXCEDE_PRESUPUESTO') setExceso(d)
        throw err
      }
    },
    alGuardar: ({ servicio: s }) => {
      setExceso(null)
      setAviso(`${s.nombre_servicio} registrado con ${s.proveedor_nombre}.`)
      return recargar()
    },
    error: 'No se pudo registrar el servicio externo.',
  })
  const form = formulario.valores
  const campo = formulario.claseCampo

  const abrir = () => {
    confirmado.current = false
    setExceso(null)
    setActividades([])
    setAviso('')
    formulario.abrir()
  }
  const cerrar = () => {
    confirmado.current = false
    setExceso(null)
    formulario.cerrar()
  }
  /** Cualquier cambio invalida la advertencia: el servidor volverá a evaluarla. */
  const cambiar = (nombre, valor) => {
    if (exceso) setExceso(null)
    confirmado.current = false
    formulario.cambiar(nombre, valor)
  }
  const elegirProyecto = (proyectoId) => {
    cambiar('proyecto_id', proyectoId)
    cambiar('actividad_id', '')
    setActividades([])
    if (proyectoId) actividadesApi.listar({ proyecto_id: proyectoId }).then(setActividades).catch(() => {})
  }
  const confirmarExceso = () => {
    confirmado.current = true
    formulario.guardar()
  }

  const valorNumero = Number(soloDigitos(form.valor_contratado) || 0)
  const actividadElegida = actividades.find((a) => String(a.id) === String(form.actividad_id))
  const totalVigente = (servicios ?? [])
    .filter((s) => s.estado !== 'CANCELADO')
    .reduce((suma, s) => suma + s.valor_contratado, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={recargar} />}
        title="Proveedores y servicios"
        subtitle="Servicios externos contratados: responsable, fechas y valor pactado con el proveedor"
      >
        {puedeCrear && (
          <button className="btn-primary" onClick={abrir}>
            <PlusIcon className="h-5 w-5" /> Nuevo servicio
          </button>
        )}
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      <div className="card flex flex-wrap items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-[14rem]">
          <label htmlFor="se-filtro" className="label">Proyecto</label>
          <select
            id="se-filtro"
            className="input"
            value={filtroProyecto}
            onChange={(e) => setFiltroProyecto(e.target.value)}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Costo en servicios externos (sin cancelados)
          </p>
          <p className="text-xl font-bold tabular-nums text-brand-900">{fmtCOP(totalVigente)}</p>
        </div>
      </div>

      {puedeCrear && (
        <ModalFormulario
          {...formulario.propsModal}
          onCerrar={cerrar}
          titulo="Registrar servicio externo"
          subtitulo="El valor se suma al costo de servicios del proyecto"
          ancho="max-w-3xl"
          textoGuardar="Registrar servicio"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="se-proveedor" className="label">Proveedor</label>
              <select id="se-proveedor" className={campo('proveedor_id')} value={form.proveedor_id} required
                onChange={(e) => cambiar('proveedor_id', e.target.value)}>
                <option value="">Seleccione un proveedor…</option>
                {proveedores.filter((p) => p.estado === 'ACTIVO').map((p) => (
                  <option key={p.id} value={p.id}>{p.razon_social}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="se-nombre" className="label">Servicio</label>
              <input id="se-nombre" maxLength={150} className={campo('nombre_servicio')} value={form.nombre_servicio} required
                placeholder="Ej. Alquiler de retroexcavadora"
                onChange={(e) => cambiar('nombre_servicio', e.target.value)} />
            </div>
            <div>
              <label htmlFor="se-proyecto" className="label">Proyecto</label>
              <select id="se-proyecto" className={campo('proyecto_id')} value={form.proyecto_id} required
                onChange={(e) => elegirProyecto(e.target.value)}>
                <option value="">Seleccione un proyecto…</option>
                {proyectos
                  .filter((p) => p.estado !== 'FINALIZADO' && p.estado !== 'CANCELADO')
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="se-actividad" className="label">Actividad</label>
              <select id="se-actividad" className={campo('actividad_id')} value={form.actividad_id} required
                disabled={!form.proyecto_id} onChange={(e) => cambiar('actividad_id', e.target.value)}>
                <option value="">{form.proyecto_id ? 'Seleccione una actividad…' : 'Elija primero el proyecto'}</option>
                {actividades.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
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

          {/* Escenario alternativo: advertencia antes de confirmar un valor que excede el presupuesto. */}
          {exceso && (
            <div role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <p className="font-semibold">⚠️ El valor supera el presupuesto disponible de la actividad</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
                <dt>Presupuesto de la actividad</dt><dd className="text-right">{fmtCOP(exceso.presupuesto)}</dd>
                <dt>Ya contratado</dt><dd className="text-right">{fmtCOP(exceso.comprometido)}</dd>
                <dt>Disponible</dt><dd className="text-right">{fmtCOP(exceso.disponible)}</dd>
                <dt>Valor de este servicio</dt><dd className="text-right">{fmtCOP(exceso.valor_contratado)}</dd>
                <dt className="font-semibold">Exceso</dt><dd className="text-right font-semibold">{fmtCOP(exceso.exceso)}</dd>
              </dl>
              <p className="mt-2 text-xs">Corrija el valor o confirme para registrarlo de todos modos.</p>
              <button type="button" className="btn-ghost mt-2" disabled={formulario.guardando} onClick={confirmarExceso}>
                Registrar de todos modos
              </button>
            </div>
          )}
        </ModalFormulario>
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
            minWidth="md:min-w-[900px]"
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
            ]}
          />
        </div>
      )}
    </div>
  )
}
