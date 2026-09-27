import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderIcon, ArrowPathIcon, PlusIcon, BuildingOffice2Icon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'
import { estadoProyecto, fmtCOP, fmtFecha } from '../lib/format.js'

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

const CLIENTE_VACIO = { numero_documento: '', tipo_documento: 'NIT', razon_social_nombre: '' }

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
  const [guardando, setGuardando] = useState(false)
  const [clienteAbierto, setClienteAbierto] = useState(false)
  const [clienteForm, setClienteForm] = useState(CLIENTE_VACIO)
  const [errorCampo, setErrorCampo] = useState(null)

  const cargar = () => {
    setError(null)
    api
      .get('/proyectos')
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

  // Carga inicial; el listado se refresca al volver a la pestaña.
  useEffect(cargar, [])

  const crear = async (e) => {
    e.preventDefault()
    setError(null)
    setAviso('')
    setErrorCampo(null)
    setGuardando(true)
    try {
      const { data } = await api.post('/proyectos', {
        ...form,
        cliente_id: Number(form.cliente_id),
        responsable_id: Number(form.responsable_id),
        presupuesto_inicial: Number(form.presupuesto_inicial),
      })
      setForm(VACIO)
      setAbierto(false)
      setAviso(`Proyecto "${data.proyecto?.nombre ?? form.nombre}" registrado en planificación.`)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo registrar el proyecto.')
      setErrorCampo(err.response?.data?.campo ?? null)
    } finally {
      setGuardando(false)
    }
  }

  // CU-02 Alt 2: el cliente no existe -> se registra aquí y queda seleccionado.
  const crearCliente = async (e) => {
    e.preventDefault()
    setError(null)
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
      setError(err.response?.data?.error ?? 'No se pudo registrar el cliente.')
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
            onClick={() => setAbierto((v) => !v)}
          >
            <PlusIcon className="h-5 w-5" /> Nuevo proyecto
          </button>
        )}
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

      {esAdmin && abierto && (
        <form onSubmit={crear} className="card space-y-5 p-6">
          <h3 className="text-base font-semibold text-slate-900">Registrar proyecto (CU-02)</h3>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="p-codigo" className="label">Código</label>
              <input id="p-codigo" className={campo('codigo')} value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
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
              <input id="p-presupuesto" type="number" min="1" step="1000"
                className={campo('presupuesto_inicial')} value={form.presupuesto_inicial}
                onChange={(e) => setForm({ ...form, presupuesto_inicial: e.target.value })} required />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="p-descripcion" className="label">Descripción</label>
              <textarea id="p-descripcion" className="input" rows={2} value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
              {guardando ? 'Registrando…' : 'Registrar proyecto'}
            </button>
            <button type="button" className="btn-ghost"
              onClick={() => { setAbierto(false); setForm(VACIO); setErrorCampo(null) }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {esAdmin && abierto && clienteAbierto && (
        <form onSubmit={crearCliente} className="card space-y-4 border border-brand-200 p-6">
          <h4 className="text-sm font-semibold text-slate-900">Registrar cliente (CU-02 Alt 2)</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="c-doc" className="label">Documento</label>
              <input id="c-doc" className={campo('numero_documento')} value={clienteForm.numero_documento}
                onChange={(e) => setClienteForm({ ...clienteForm, numero_documento: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="c-tipo" className="label">Tipo</label>
              <select id="c-tipo" className="input" value={clienteForm.tipo_documento}
                onChange={(e) => setClienteForm({ ...clienteForm, tipo_documento: e.target.value })}>
                <option value="NIT">NIT</option>
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <div>
              <label htmlFor="c-nombre" className="label">Razón social / nombre</label>
              <input id="c-nombre" className={campo('razon_social_nombre')} value={clienteForm.razon_social_nombre}
                onChange={(e) => setClienteForm({ ...clienteForm, razon_social_nombre: e.target.value })} required />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary">Registrar cliente</button>
            <button type="button" className="btn-ghost" onClick={() => setClienteAbierto(false)}>Cerrar</button>
          </div>
        </form>
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
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-brand-600 transition-all"
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
