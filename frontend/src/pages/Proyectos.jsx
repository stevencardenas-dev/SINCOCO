import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderIcon, ArrowPathIcon, PlusIcon, BuildingOffice2Icon, ClipboardDocumentListIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'
import { estadoProyecto, fmtCOP, fmtFecha, fmtMiles, montoEnPalabras, soloDigitos } from '../lib/format.js'

/**
 * Módulo de proyectos (RF02 · HU-02). El listado consume GET /api/proyectos y
 * el formulario implementa CU-02 (registrar proyecto) contra POST /api/proyectos.
 * Las validaciones de negocio viven en el backend; aquí se muestran sus errores,
 * incluido el campo señalado (CU-02 Alt 1 y Alt 2).
 */

const VACIO = {
  codigo: '',
  nombre: '',
  cliente_id: '',
  responsable_id: '',
  ubicacion: '',
  presupuesto_inicial: '',
  fecha_inicio_programada: '',
  fecha_fin_programada: '',
  descripcion: '',
  observaciones: '',
}

const CLIENTE_VACIO = {
  numero_documento: '',
  tipo_documento: 'NIT',
  razon_social_nombre: '',
  nombre_contacto: '',
  telefono: '',
}

// presupuesto_inicial es decimal(15,2): 13 dígitos enteros como máximo.
const MAX_DIGITOS_PRESUPUESTO = 13

export default function Proyectos() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'ADMINISTRADOR'

  const [proyectos, setProyectos] = useState(null)
  const [clientes, setClientes] = useState([])
  const [responsables, setResponsables] = useState([])
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState('')
  const [form, setForm] = useState(VACIO)
  const [abierto, setAbierto] = useState(false)
  // Proyecto en edición: null = el formulario está registrando uno nuevo.
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [clienteAbierto, setClienteAbierto] = useState(false)
  const [clienteForm, setClienteForm] = useState(CLIENTE_VACIO)
  // Error propio del alta de cliente: se muestra dentro de su ventana, no en el
  // aviso de la página (que queda detrás del modal).
  const [errorCliente, setErrorCliente] = useState('')
  const [errorCampo, setErrorCampo] = useState(null)
  // HU-18: por defecto no se muestran los proyectos dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)

  // Presupuesto capturado, como número, para el resumen que va bajo el campo.
  const presupuestoNumero = Number(soloDigitos(form.presupuesto_inicial) || 0)

  const cargar = () => {
    setError(null)
    api
      .get('/proyectos', { params: incluirInactivos ? { incluirInactivos: 1 } : {} })
      .then((res) => setProyectos(res.data))
      .catch(() => setError('No se pudieron cargar los proyectos. Verifique que el backend esté disponible.'))

    // El formulario de CU-02 es del administrador; solo él carga el catálogo
    // de clientes y la lista de responsables.
    if (esAdmin) {
      api.get('/clientes').then((res) => setClientes(res.data)).catch(() => {})
      // El responsable es un trabajador activo (HU-04), no un usuario del sistema.
      api.get('/trabajadores').then((res) => setResponsables(res.data)).catch(() => {})
    }
  }

  // Carga inicial y al cambiar el filtro de inactivos.
  useEffect(cargar, [incluirInactivos])

  // HU-18: baja lógica y reactivación de proyectos (nunca borrado físico).
  const cambiarBaja = async (p) => {
    setError(null)
    setAviso('')
    try {
      await api.patch(`/proyectos/${p.id}/${p.activo ? 'baja' : 'reactivar'}`)
      setAviso(`${p.nombre}: ${p.activo ? 'dado de baja' : 'reactivado'}.`)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo cambiar el estado del proyecto.')
    }
  }

  // CU-02: registrar un proyecto nuevo o actualizar el que se está editando.
  const guardar = async (e) => {
    e.preventDefault()
    setError(null)
    setAviso('')
    setErrorCampo(null)
    setGuardando(true)
    try {
      const cuerpo = {
        ...form,
        cliente_id: Number(form.cliente_id),
        responsable_id: Number(form.responsable_id),
        presupuesto_inicial: Number(soloDigitos(form.presupuesto_inicial) || 0),
      }
      const { data } = editando
        ? await api.patch(`/proyectos/${editando}`, cuerpo)
        : await api.post('/proyectos', cuerpo)
      const nombre = data.proyecto?.nombre ?? form.nombre
      setAviso(editando ? `Proyecto "${nombre}" actualizado.` : `Proyecto "${nombre}" registrado en planificación.`)
      cerrarFormulario()
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo guardar el proyecto.')
      setErrorCampo(err.response?.data?.campo ?? null)
    } finally {
      setGuardando(false)
    }
  }

  const cerrarFormulario = () => {
    setAbierto(false)
    setEditando(null)
    setForm(VACIO)
    setErrorCampo(null)
  }

  /** Pasa el proyecto a edición: el formulario se abre con sus datos actuales. */
  const abrirEditar = (p) => {
    setError(null)
    setAviso('')
    setErrorCampo(null)
    setEditando(p.id)
    setForm({
      codigo: p.codigo ?? '',
      nombre: p.nombre ?? '',
      cliente_id: String(p.cliente_id ?? ''),
      responsable_id: String(p.responsable_id ?? ''),
      ubicacion: p.ubicacion ?? '',
      // El presupuesto llega como decimal ('1250000000.00'): se pasa a dígitos.
      presupuesto_inicial: String(Math.round(Number(p.presupuesto_inicial ?? 0))),
      fecha_inicio_programada: String(p.fecha_inicio_programada ?? '').slice(0, 10),
      fecha_fin_programada: String(p.fecha_fin_programada ?? '').slice(0, 10),
      descripcion: p.descripcion ?? '',
      observaciones: p.observaciones ?? '',
    })
    setAbierto(true)
  }

  // CU-02 Alt 2: el cliente no existe -> se registra aquí y queda seleccionado.
  const crearCliente = async (e) => {
    e.preventDefault()
    setError(null)
    setErrorCliente('')
    setErrorCampo(null)
    try {
      const { data } = await api.post('/clientes', clienteForm)
      setClientes((prev) => [...prev, data.cliente].sort((a, b) =>
        a.razon_social_nombre.localeCompare(b.razon_social_nombre)))
      setForm((f) => ({ ...f, cliente_id: String(data.cliente.id) }))
      setClienteForm(CLIENTE_VACIO)
      setClienteAbierto(false)
      setAviso(`Cliente "${data.cliente.razon_social_nombre}" registrado y seleccionado.`)
    } catch (err) {
      setErrorCliente(err.response?.data?.error ?? 'No se pudo registrar el cliente.')
      setErrorCampo(err.response?.data?.campo ?? null)
    }
  }

  const campo = (nombre) => (errorCampo === nombre ? 'input border-red-400' : 'input')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        subtitle="Registro, etapas, actividades y seguimiento de avance · RF02 · RF03 · RF04"
      >
        {esAdmin && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => { setEditando(null); setForm(VACIO); setErrorCampo(null); setAbierto(true) }}
          >
            <PlusIcon className="h-5 w-5" /> Nuevo proyecto
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
        <button type="button" onClick={cargar} className="btn-ghost inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" /> Actualizar
        </button>
      </PageHeader>

      {error && (
        <div role="alert" className="card border-l-4 border-red-400 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {aviso && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {aviso}
        </p>
      )}

      {esAdmin && (
        <Modal
          abierto={abierto}
          titulo={editando ? 'Actualizar proyecto' : 'Registrar proyecto (CU-02)'}
          subtitulo={editando ? `Código ${form.codigo} · el cambio queda en la bitácora` : 'CU-02 · queda en estado de planificación'}
          onCerrar={cerrarFormulario}
          ancho="max-w-3xl"
        >
        <form onSubmit={guardar} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="p-codigo" className="label">Código</label>
              <input id="p-codigo" className={campo('codigo')} value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                disabled={Boolean(editando)} required />
              {editando && (
                <p className="mt-1 text-xs text-slate-500">
                  El código identifica el proyecto y no se edita.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="p-nombre" className="label">Nombre</label>
              <input id="p-nombre" className={campo('nombre')} value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>

            <div>
              <label htmlFor="p-cliente" className="label">Cliente</label>
              <select id="p-cliente" className={campo('cliente_id')} value={form.cliente_id}
                onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required>
                <option value="">Seleccione un cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social_nombre} — {c.tipo_documento} {c.numero_documento}
                  </option>
                ))}
              </select>
              <button type="button" className="mt-1 text-xs font-medium text-brand-700 hover:underline"
                onClick={() => setClienteAbierto((v) => !v)}>
                <BuildingOffice2Icon className="mr-1 inline h-4 w-4" />
                El cliente no está en la lista: registrarlo
              </button>
            </div>
            <div>
              <label htmlFor="p-responsable" className="label">Responsable</label>
              <select id="p-responsable" className={campo('responsable_id')} value={form.responsable_id}
                onChange={(e) => setForm({ ...form, responsable_id: e.target.value })} required>
                <option value="">Seleccione un responsable…</option>
                {responsables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombres} {t.apellidos} — {t.cargo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="p-inicio" className="label">Inicio programado</label>
              <input id="p-inicio" type="date" className={campo('fecha_inicio_programada')}
                value={form.fecha_inicio_programada}
                onChange={(e) => setForm({ ...form, fecha_inicio_programada: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="p-fin" className="label">Fin programado</label>
              <input id="p-fin" type="date" className={campo('fecha_fin_programada')}
                value={form.fecha_fin_programada}
                onChange={(e) => setForm({ ...form, fecha_fin_programada: e.target.value })} required />
            </div>

            <div>
              <label htmlFor="p-ubicacion" className="label">Ubicación</label>
              <input id="p-ubicacion" className={campo('ubicacion')} value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="p-presupuesto" className="label">Presupuesto inicial (COP)</label>
              {/* Campo de moneda: se capturan solo dígitos y se muestran con
                  separador de miles, para no confundir miles con millones. */}
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  $
                </span>
                <input id="p-presupuesto" type="text" inputMode="numeric" autoComplete="off"
                  placeholder="850.000.000"
                  className={`${campo('presupuesto_inicial')} pl-8 tabular-nums`}
                  value={fmtMiles(form.presupuesto_inicial)}
                  onChange={(e) => setForm({
                    ...form,
                    presupuesto_inicial: soloDigitos(e.target.value).slice(0, MAX_DIGITOS_PRESUPUESTO),
                  })} required />
              </div>
              <p
                className={`mt-1 text-xs ${
                  form.presupuesto_inicial && presupuestoNumero <= 0
                    ? 'font-medium text-red-600'
                    : 'text-slate-500'
                }`}
              >
                {presupuestoNumero > 0
                  ? `${fmtCOP(presupuestoNumero)} · ${montoEnPalabras(form.presupuesto_inicial)}`
                  : form.presupuesto_inicial
                    ? 'El presupuesto debe ser mayor que cero.'
                    : 'Escriba el monto en pesos, sin puntos: se separan solos.'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="p-descripcion" className="label">Descripción</label>
              <textarea id="p-descripcion" className="input" rows={2} value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar proyecto'}
            </button>
            <button type="button" className="btn-ghost" onClick={cerrarFormulario}>
              Cancelar
            </button>
          </div>
        </form>
        </Modal>
      )}

      {/* CU-02 Alt 2: el cliente que no está en la lista se registra en una
          ventana emergente encima del formulario. Antes aparecía al final de la
          página, así que había que bajar y se perdía de vista el proyecto que
          se estaba registrando. */}
      {esAdmin && (
        <Modal
          abierto={clienteAbierto}
          titulo="Registrar cliente"
          subtitulo="CU-02 Alt 2 · queda guardado en el catálogo y seleccionado en el proyecto"
          onCerrar={() => { setClienteAbierto(false); setErrorCliente(''); setErrorCampo(null) }}
        >
          <form onSubmit={crearCliente} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-tipo" className="label">Tipo de documento</label>
                <select id="c-tipo" className="input" value={clienteForm.tipo_documento}
                  onChange={(e) => setClienteForm({ ...clienteForm, tipo_documento: e.target.value })}>
                  <option value="NIT">NIT</option>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div>
                <label htmlFor="c-doc" className="label">Documento</label>
                <input id="c-doc" className={campo('numero_documento')} value={clienteForm.numero_documento}
                  onChange={(e) => setClienteForm({ ...clienteForm, numero_documento: e.target.value })} required />
              </div>
            </div>
            <div>
              <label htmlFor="c-nombre" className="label">Razón social / nombre</label>
              <input id="c-nombre" className={campo('razon_social_nombre')} value={clienteForm.razon_social_nombre}
                onChange={(e) => setClienteForm({ ...clienteForm, razon_social_nombre: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-contacto" className="label">Nombre del contacto</label>
                <input id="c-contacto" className="input" value={clienteForm.nombre_contacto}
                  onChange={(e) => setClienteForm({ ...clienteForm, nombre_contacto: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-telefono" className="label">Teléfono</label>
                <input id="c-telefono" className="input" value={clienteForm.telefono}
                  onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })} />
              </div>
            </div>

            {errorCliente && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorCliente}
              </p>
            )}

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button type="submit" className="btn-primary">Registrar cliente</button>
              <button type="button" className="btn-ghost"
                onClick={() => { setClienteAbierto(false); setErrorCliente('') }}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {proyectos === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando proyectos…
        </div>
      )}

      {proyectos !== null && proyectos.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <FolderIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay proyectos</p>
          <p className="text-xs text-slate-500">
            {esAdmin
              ? 'Registre el primer proyecto con el botón «Nuevo proyecto» (CU-02).'
              : 'El administrador todavía no ha registrado proyectos.'}
          </p>
        </div>
      )}

      {proyectos !== null && proyectos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5 font-semibold">Proyecto</th>
                  <th className="px-5 py-3.5 font-semibold">Responsable</th>
                  <th className="px-5 py-3.5 font-semibold">Ubicación</th>
                  <th className="px-5 py-3.5 font-semibold">Presupuesto</th>
                  <th className="px-5 py-3.5 font-semibold">Estado</th>
                  <th className="px-5 py-3.5 font-semibold">Avance</th>
                  <th className="px-5 py-3.5 font-semibold">Plan</th>
                  <th className="px-5 py-3.5 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proyectos.map((p) => {
                  // El backend devuelve el enum del esquema (PLANIFICACION, ...);
                  // format.js lo indexa en minúsculas.
                  const est = estadoProyecto[p.estado?.toLowerCase()] ?? estadoProyecto.planificacion
                  const avance = Number(p.porcentaje_avance_total)
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{p.nombre}</p>
                        <p className="text-xs text-slate-400">
                          {p.codigo} · {p.cliente_nombre} · {fmtFecha(p.fecha_inicio_programada)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{p.responsable_nombre}</td>
                      <td className="px-5 py-4 text-slate-600">{p.ubicacion}</td>
                      <td className="px-5 py-4 font-medium tabular-nums text-slate-700">
                        {fmtCOP(Number(p.presupuesto_inicial))}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge ring-1 ${est.cls}`}>{est.label}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-brand-100">
                            <div
                              className="h-full rounded-full bg-accent-500 transition-all"
                              style={{ width: `${avance}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-slate-600">{avance}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Link to={`/proyectos/${p.id}`} className="btn-ghost text-xs">
                          <ClipboardDocumentListIcon className="h-4 w-4" /> Plan
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {esAdmin && p.activo && (
                            <button
                              className="btn-ghost text-xs"
                              onClick={() => abrirEditar(p)}
                              aria-label={`Actualizar ${p.nombre}`}
                            >
                              <PencilSquareIcon className="h-4 w-4" /> Editar
                            </button>
                          )}
                          {esAdmin && (
                            <button
                              className="btn-ghost text-xs"
                              onClick={() => cambiarBaja(p)}
                              aria-label={p.activo ? `Dar de baja ${p.nombre}` : `Reactivar ${p.nombre}`}
                            >
                              {p.activo ? 'Dar de baja' : 'Reactivar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        El avance del proyecto se deriva de sus actividades según la regla de cálculo definida por la empresa (RN09).
        Las etapas y actividades con responsables, fechas y evidencias llegan con HU-03 (RF03 · RF04).
      </p>
    </div>
  )
}
