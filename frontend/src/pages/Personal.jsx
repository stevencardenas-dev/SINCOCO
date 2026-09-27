import { useEffect, useState } from 'react'
import { ArrowPathIcon, PlusIcon, UsersIcon } from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api'

/**
 * HU-04 (RF06 · RF07): registrar el personal con su cargo y especialidad.
 * El backend valida documento único, la especialidad obligatoria para cargos
 * operativos y deja el trabajador disponible y activo al crearse.
 */

const VACIO = {
  numero_documento: '',
  tipo_documento: 'CC',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  direccion: '',
  cargo: '',
  especialidad: '',
}

const ESTADO_BADGE = {
  ACTIVO: 'bg-emerald-50 text-emerald-700',
  INACTIVO: 'bg-slate-100 text-slate-600',
  VACACIONES: 'bg-amber-50 text-amber-700',
  LICENCIA: 'bg-sky-50 text-sky-700',
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
  const [guardando, setGuardando] = useState(false)
  // HU-18: por defecto no se muestran los registros dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)

  const cargar = () => {
    setError('')
    api
      .get('/trabajadores', { params: incluirInactivos ? { incluirInactivos: 1 } : {} })
      .then((res) => setPersonal(res.data))
      .catch(() => setError('No se pudo cargar el personal.'))
  }

  useEffect(cargar, [incluirInactivos])

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

  const crear = async (e) => {
    e.preventDefault()
    setError('')
    setAviso('')
    setErrorCampo(null)
    setGuardando(true)
    try {
      const { data } = await api.post('/trabajadores', form)
      const t = data.trabajador
      setAviso(`${t.nombres} ${t.apellidos} registrado como ${t.cargo}.`)
      setForm(VACIO)
      setAbierto(false)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo registrar el trabajador.')
      setErrorCampo(err.response?.data?.campo ?? null)
    } finally {
      setGuardando(false)
    }
  }

  const campo = (nombre) => (errorCampo === nombre ? 'input border-red-400' : 'input')

  return (
    <div className="space-y-6">
      <PageHeader title="Personal" subtitle="Registrar personal con cargo y especialidad · RF06 · RF07 · CU-04">
        {esAdmin && (
          <button className="btn-primary" onClick={() => setAbierto((v) => !v)}>
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

      {esAdmin && abierto && (
        <form onSubmit={crear} className="card space-y-5 p-6">
          <h3 className="text-base font-semibold text-slate-900">Registrar personal</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="t-doc" className="label">Número de documento</label>
              <input id="t-doc" className={campo('numero_documento')} value={form.numero_documento}
                onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} required />
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
              <input id="t-cargo" className={campo('cargo')} value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="t-especialidad" className="label">Especialidad</label>
              <input id="t-especialidad" className={campo('especialidad')} value={form.especialidad}
                onChange={(e) => setForm({ ...form, especialidad: e.target.value })} />
              <p className="mt-1 text-xs text-slate-500">
                Obligatoria para cargos operativos (maestro de obra, oficial, obrero…).
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="t-direccion" className="label">Dirección</label>
              <input id="t-direccion" className="input" value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
              {guardando ? 'Registrando…' : 'Registrar trabajador'}
            </button>
            <button type="button" className="btn-ghost"
              onClick={() => { setAbierto(false); setForm(VACIO); setErrorCampo(null) }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

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
                    <td className="px-5 py-4 text-right">
                      {esAdmin && (
                        <button
                          className="btn-ghost text-xs"
                          onClick={() => cambiarBaja(t)}
                          aria-label={t.activo ? `Dar de baja a ${t.nombres}` : `Reactivar a ${t.nombres}`}
                        >
                          {t.activo ? 'Dar de baja' : 'Reactivar'}
                        </button>
                      )}
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
