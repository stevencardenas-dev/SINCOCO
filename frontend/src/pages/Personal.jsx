import { useEffect, useState } from 'react'
import { ArrowPathIcon, PencilSquareIcon, PlusIcon, UsersIcon } from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'

/**
 * HU-04 (RF06 · RF07): registrar el personal con su cargo y especialidad.
 *
 * El cargo y la especialidad ya no se escriben a mano: salen de las tablas de
 * dominio `cargos` y `especialidades` (GET /api/catalogos). Si el cargo que
 * necesita no existe, se registra ahí mismo en una ventana emergente y queda
 * seleccionado; la regla de la especialidad obligatoria la decide el catálogo
 * (`cargos.operativo`), no el código.
 *
 * El formulario vive en un modal para no empujar la tabla hacia abajo.
 */

const VACIO = {
  numero_documento: '',
  tipo_documento: 'CC',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  direccion: '',
  cargo_id: '',
  especialidad_id: '',
  estado: 'ACTIVO',
  disponible: true,
}

const ESTADO_BADGE = {
  ACTIVO: 'bg-emerald-50 text-emerald-700',
  INACTIVO: 'bg-slate-100 text-slate-600',
  VACACIONES: 'bg-amber-50 text-amber-700',
  LICENCIA: 'bg-sky-50 text-sky-700',
}

const CATALOGO_TITULO = {
  cargos: 'Registrar un cargo',
  especialidades: 'Registrar una especialidad',
}

export default function Personal() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'ADMINISTRADOR'

  const [personal, setPersonal] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [errorCampo, setErrorCampo] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [abierto, setAbierto] = useState(false)
  // Trabajador en edición: null = el formulario está registrando uno nuevo.
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  // HU-18: por defecto no se muestran los registros dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)

  // Catálogos del cargo y la especialidad.
  const [cargos, setCargos] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [nuevoCatalogo, setNuevoCatalogo] = useState(null)
  const [catalogoForm, setCatalogoForm] = useState({ nombre: '', descripcion: '', operativo: false })
  const [errorCatalogo, setErrorCatalogo] = useState('')
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false)

  const cargar = () => {
    setError('')
    api
      .get('/trabajadores', { params: incluirInactivos ? { incluirInactivos: 1 } : {} })
      .then((res) => setPersonal(res.data))
      .catch(() => setError('No se pudo cargar el personal.'))
  }

  const cargarCatalogos = () => {
    api.get('/catalogos/cargos').then((res) => setCargos(res.data)).catch(() => {})
    api.get('/catalogos/especialidades').then((res) => setEspecialidades(res.data)).catch(() => {})
  }

  useEffect(cargar, [incluirInactivos])
  useEffect(cargarCatalogos, [])

  // HU-18: baja lógica y reactivación (nunca borrado físico).
  const cambiarBaja = async (t) => {
    setError('')
    setAviso('')
    try {
      await api.patch(`/trabajadores/${t.id}/${t.activo ? 'baja' : 'reactivar'}`)
      setAviso(`${t.nombres} ${t.apellidos}: ${t.activo ? 'dado de baja' : 'reactivado'}.`)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo cambiar el estado del trabajador.')
    }
  }

  /** CU-04: registrar o actualizar el personal con su cargo y especialidad. */
  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setAviso('')
    setErrorCampo(null)
    setGuardando(true)
    try {
      const cuerpo = {
        ...form,
        cargo_id: Number(form.cargo_id),
        especialidad_id: form.especialidad_id ? Number(form.especialidad_id) : null,
      }
      const { data } = editando
        ? await api.patch(`/trabajadores/${editando}`, cuerpo)
        : await api.post('/trabajadores', cuerpo)
      const t = data.trabajador
      setAviso(
        editando
          ? `${t.nombres} ${t.apellidos}: información actualizada (${t.cargo}).`
          : `${t.nombres} ${t.apellidos} registrado como ${t.cargo}.`,
      )
      cerrarFormulario()
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo guardar el trabajador.')
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

  /** Pasa el trabajador a edición: el formulario se abre con sus datos actuales. */
  const abrirEditar = (t) => {
    setError('')
    setAviso('')
    setErrorCampo(null)
    setEditando(t.id)
    setForm({
      numero_documento: t.numero_documento ?? '',
      tipo_documento: t.tipo_documento ?? 'CC',
      nombres: t.nombres ?? '',
      apellidos: t.apellidos ?? '',
      email: t.email ?? '',
      telefono: t.telefono ?? '',
      direccion: t.direccion ?? '',
      cargo_id: String(t.cargo_id ?? ''),
      especialidad_id: t.especialidad_id ? String(t.especialidad_id) : '',
      estado: t.estado ?? 'ACTIVO',
      disponible: Boolean(Number(t.disponible)),
    })
    setAbierto(true)
  }

  /**
   * Registra un cargo o una especialidad nueva sin salir del formulario: queda
   * en el catálogo (el administrador lo puede editar después en Catálogo) y de
   * una vez seleccionada en el trabajador que se está registrando.
   */
  const crearCatalogo = async (e) => {
    e.preventDefault()
    setErrorCatalogo('')
    setGuardandoCatalogo(true)
    try {
      const { data } = await api.post(`/catalogos/${nuevoCatalogo}`, {
        nombre: catalogoForm.nombre,
        descripcion: catalogoForm.descripcion,
        ...(nuevoCatalogo === 'cargos' ? { operativo: catalogoForm.operativo } : {}),
      })
      const fila = data[nuevoCatalogo === 'cargos' ? 'cargo' : 'especialidad']
      if (nuevoCatalogo === 'cargos') {
        setCargos((prev) => [...prev, fila].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setForm((f) => ({ ...f, cargo_id: String(fila.id) }))
      } else {
        setEspecialidades((prev) => [...prev, fila].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setForm((f) => ({ ...f, especialidad_id: String(fila.id) }))
      }
      setAviso(`${fila.nombre} agregado al catálogo y seleccionado.`)
      setNuevoCatalogo(null)
      setCatalogoForm({ nombre: '', descripcion: '', operativo: false })
    } catch (err) {
      setErrorCatalogo(err.response?.data?.error ?? 'No se pudo registrar en el catálogo.')
    } finally {
      setGuardandoCatalogo(false)
    }
  }

  const campo = (nombre) => (errorCampo === nombre ? 'input border-red-400' : 'input')

  const cargoElegido = cargos.find((c) => String(c.id) === String(form.cargo_id))

  return (
    <div className="space-y-6">
      <PageHeader title="Personal" subtitle="Registrar personal con cargo y especialidad · RF06 · RF07 · CU-04">
        {esAdmin && (
          <button className="btn-primary"
            onClick={() => { setEditando(null); setForm(VACIO); setErrorCampo(null); setAbierto(true) }}>
            <PlusIcon className="h-5 w-5" /> Nuevo trabajador
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
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      )}
      {aviso && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{aviso}</p>
      )}

      {/* Formulario de registro: en ventana emergente, no al final de la página. */}
      {esAdmin && (
        <Modal
          abierto={abierto}
          titulo={editando ? 'Actualizar información del trabajador' : 'Registrar personal'}
          subtitulo={editando
            ? 'El cambio queda registrado en la bitácora de trazabilidad'
            : 'Cargo y especialidad salen del catálogo de la empresa · CU-04'}
          onCerrar={cerrarFormulario}
          ancho="max-w-3xl"
        >
          <form onSubmit={guardar} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="t-doc" className="label">Número de documento</label>
                <input id="t-doc" className={campo('numero_documento')} value={form.numero_documento}
                  onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
                  disabled={Boolean(editando)} required />
                {editando && (
                  <p className="mt-1 text-xs text-slate-500">El documento identifica al trabajador y no se edita.</p>
                )}
              </div>
              <div>
                <label htmlFor="t-tipo" className="label">Tipo de documento</label>
                <select id="t-tipo" className="input" value={form.tipo_documento}
                  onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="NIT">NIT</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div>
                <label htmlFor="t-nombres" className="label">Nombres</label>
                <input id="t-nombres" className="input" value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="t-apellidos" className="label">Apellidos</label>
                <input id="t-apellidos" className="input" value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="t-email" className="label">Correo</label>
                <input id="t-email" type="email" className={campo('email')} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label htmlFor="t-telefono" className="label">Teléfono</label>
                <input id="t-telefono" className="input" value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>

              <div>
                <label htmlFor="t-cargo" className="label">Cargo</label>
                <select id="t-cargo" className={campo('cargo_id')} value={form.cargo_id}
                  onChange={(e) => {
                    if (e.target.value === '__nuevo__') {
                      setNuevoCatalogo('cargos')
                      setCatalogoForm({ nombre: '', descripcion: '', operativo: false })
                      setErrorCatalogo('')
                      return
                    }
                    setForm({ ...form, cargo_id: e.target.value })
                  }} required>
                  <option value="">Seleccione un cargo…</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}{c.operativo ? ' · obra' : ''}
                    </option>
                  ))}
                  {esAdmin && <option value="__nuevo__">+ Registrar un cargo nuevo…</option>}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {cargoElegido
                    ? cargoElegido.operativo
                      ? 'Cargo de obra: la especialidad es obligatoria.'
                      : 'Cargo administrativo: la especialidad es opcional.'
                    : `${cargos.length} cargos en el catálogo de la empresa.`}
                </p>
              </div>
              <div>
                <label htmlFor="t-especialidad" className="label">Especialidad</label>
                <select id="t-especialidad" className={campo('especialidad_id')} value={form.especialidad_id}
                  onChange={(e) => {
                    if (e.target.value === '__nuevo__') {
                      setNuevoCatalogo('especialidades')
                      setCatalogoForm({ nombre: '', descripcion: '', operativo: false })
                      setErrorCatalogo('')
                      return
                    }
                    setForm({ ...form, especialidad_id: e.target.value })
                  }}>
                  <option value="">Sin especialidad</option>
                  {especialidades.map((e2) => (
                    <option key={e2.id} value={e2.id}>{e2.nombre}</option>
                  ))}
                  {esAdmin && <option value="__nuevo__">+ Registrar una especialidad nueva…</option>}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Obligatoria para los cargos marcados como de obra (maestro de obra, oficial, obrero…).
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="t-direccion" className="label">Dirección</label>
                <input id="t-direccion" className="input" value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </div>

              {/* Estado y disponibilidad: se ajustan al actualizar la ficha. */}
              <div>
                <label htmlFor="t-estado" className="label">Estado</label>
                <select id="t-estado" className="input" value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="VACACIONES">Vacaciones</option>
                  <option value="LICENCIA">Licencia</option>
                </select>
              </div>
              <label className="flex items-end gap-2 pb-2.5 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={Boolean(form.disponible)}
                  onChange={(e) => setForm({ ...form, disponible: e.target.checked })} />
                Disponible para asignación
              </label>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar trabajador'}
              </button>
              <button type="button" className="btn-ghost" onClick={cerrarFormulario}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Alta rápida de un valor del catálogo sin salir del formulario. */}
      <Modal
        abierto={nuevoCatalogo !== null}
        titulo={CATALOGO_TITULO[nuevoCatalogo] ?? ''}
        subtitulo="Queda guardado en el catálogo de la empresa y seleccionado en el formulario"
        onCerrar={() => { setNuevoCatalogo(null); setErrorCatalogo('') }}
      >
        <form onSubmit={crearCatalogo} className="space-y-4">
          <div>
            <label htmlFor="cat-nombre" className="label">Nombre</label>
            <input id="cat-nombre" className="input" value={catalogoForm.nombre} required minLength={3}
              onChange={(e) => setCatalogoForm({ ...catalogoForm, nombre: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cat-descripcion" className="label">Descripción</label>
            <input id="cat-descripcion" className="input" value={catalogoForm.descripcion}
              onChange={(e) => setCatalogoForm({ ...catalogoForm, descripcion: e.target.value })} />
          </div>
          {nuevoCatalogo === 'cargos' && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={catalogoForm.operativo}
                onChange={(e) => setCatalogoForm({ ...catalogoForm, operativo: e.target.checked })} />
              <span>
                Es cargo de obra
                <span className="block text-xs text-slate-500">
                  Para estos cargos la especialidad es obligatoria (criterio 2 de HU-04).
                </span>
              </span>
            </label>
          )}

          {errorCatalogo && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorCatalogo}
            </p>
          )}

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button type="submit" disabled={guardandoCatalogo} className="btn-primary disabled:opacity-60">
              {guardandoCatalogo ? 'Guardando…' : 'Agregar al catálogo'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setNuevoCatalogo(null)}>Cancelar</button>
          </div>
        </form>
      </Modal>

      {personal === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando personal…
        </div>
      )}

      {personal !== null && personal.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <UsersIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay personal registrado</p>
        </div>
      )}

      {personal !== null && personal.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5 font-semibold">Trabajador</th>
                  <th className="px-5 py-3.5 font-semibold">Documento</th>
                  <th className="px-5 py-3.5 font-semibold">Cargo</th>
                  <th className="px-5 py-3.5 font-semibold">Especialidad</th>
                  <th className="px-5 py-3.5 font-semibold">Estado</th>
                  <th className="px-5 py-3.5 font-semibold">Disponibilidad</th>
                  <th className="px-5 py-3.5 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {personal.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {t.nombres} {t.apellidos}
                      {t.email && <p className="text-xs font-normal text-slate-400">{t.email}</p>}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{t.tipo_documento} {t.numero_documento}</td>
                    <td className="px-5 py-4 text-slate-600">{t.cargo}</td>
                    <td className="px-5 py-4 text-slate-600">{t.especialidad ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ESTADO_BADGE[t.estado] ?? 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{t.disponible ? 'Disponible' : 'No disponible'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {esAdmin && t.activo && (
                          <button
                            className="btn-ghost text-xs"
                            onClick={() => abrirEditar(t)}
                            aria-label={`Actualizar información de ${t.nombres}`}
                          >
                            <PencilSquareIcon className="h-4 w-4" /> Editar
                          </button>
                        )}
                        {esAdmin && (
                          <button
                            className="btn-ghost text-xs"
                            onClick={() => cambiarBaja(t)}
                            aria-label={t.activo ? `Dar de baja a ${t.nombres}` : `Reactivar a ${t.nombres}`}
                          >
                            {t.activo ? 'Dar de baja' : 'Reactivar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
