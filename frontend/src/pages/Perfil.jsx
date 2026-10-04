import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  IdentificationIcon,
  KeyIcon,
  MapPinIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import CampoPassword from '../components/CampoPassword.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SelectorUbicacion from '../components/SelectorUbicacion.jsx'
import TelefonoPais from '../components/TelefonoPais.jsx'
import api from '../services/api'
import { fmtFechaHora } from '../lib/format.js'

/**
 * Información personal (HU-01 · HU-04).
 *
 * Cualquier usuario, sea del rol que sea, consulta aquí sus datos: los de su
 * cuenta de acceso (usuario, rol, correo empresarial, último acceso) y los de su
 * ficha de trabajador (documento, contacto, cargo y especialidad del catálogo).
 *
 * Editable: teléfono, correo de contacto, dirección y la contraseña. El número
 * de documento no se modifica: es la identidad de la ficha. El correo empresarial
 * lo administra la empresa, y el rol, el cargo y la especialidad los cambia el
 * administrador en Usuarios y Catálogo.
 */

const VACIO_DATOS = { telefono: '', email: '', direccion: '' }
const VACIO_CLAVE = { password_actual: '', password: '', repetir: '' }

export default function Perfil() {
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [errorCampo, setErrorCampo] = useState(null)

  const [datos, setDatos] = useState(VACIO_DATOS)
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  // Selector de ubicación en el mapa (Leaflet) para la dirección.
  const [mapaAbierto, setMapaAbierto] = useState(false)

  const [clave, setClave] = useState(VACIO_CLAVE)
  const [errorClave, setErrorClave] = useState('')
  const [guardandoClave, setGuardandoClave] = useState(false)

  const aplicar = (data) => {
    setPerfil(data)
    setDatos({
      telefono: data.trabajador?.telefono ?? '',
      email: data.trabajador?.email ?? '',
      direccion: data.trabajador?.direccion ?? '',
    })
  }

  const cargar = () => {
    setError('')
    api
      .get('/perfil')
      .then((res) => aplicar(res.data))
      .catch(() => setError('No se pudo cargar su información personal.'))
  }

  useEffect(cargar, [])

  const guardarDatos = async (e) => {
    e.preventDefault()
    setError('')
    setAviso('')
    setErrorCampo(null)
    setGuardandoDatos(true)
    try {
      const { data } = await api.patch('/perfil', datos)
      aplicar(data)
      setAviso('Su información se actualizó correctamente.')
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo guardar su información.')
      setErrorCampo(err.response?.data?.campo ?? null)
    } finally {
      setGuardandoDatos(false)
    }
  }

  const cambiarClave = async (e) => {
    e.preventDefault()
    setErrorClave('')
    setAviso('')
    // RNF04: la validación también está en el backend; aquí se avisa antes.
    if (clave.password !== clave.repetir) {
      setErrorClave('La contraseña nueva y su confirmación no coinciden.')
      return
    }
    setGuardandoClave(true)
    try {
      await api.patch('/perfil', {
        password_actual: clave.password_actual,
        password: clave.password,
      })
      setClave(VACIO_CLAVE)
      setAviso('Contraseña actualizada. Úsela en el próximo ingreso.')
    } catch (err) {
      setErrorClave(err.response?.data?.error ?? 'No se pudo cambiar la contraseña.')
    } finally {
      setGuardandoClave(false)
    }
  }

  const campo = (nombre) => (errorCampo === nombre ? 'input border-red-400' : 'input')
  const cuenta = perfil?.usuario
  const trabajador = perfil?.trabajador

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi información personal"
        subtitle="Sus datos de acceso y su ficha de trabajador"
      >
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

      {perfil === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando su información…
        </div>
      )}

      {/* Mapa para la dirección personal: devuelve el texto al formulario. */}
      <SelectorUbicacion
        abierto={mapaAbierto}
        valorInicial={datos.direccion}
        onCerrar={() => setMapaAbierto(false)}
        onAceptar={(texto) => {
          setDatos((d) => ({ ...d, direccion: texto }))
          setMapaAbierto(false)
        }}
      />

      {perfil && (
        <>
          {/* Cuenta de acceso: solo lectura (la administra el administrador). */}
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <UserCircleIcon className="h-5 w-5 text-brand-600" />
              <h3 className="text-base font-semibold text-slate-900">Mi cuenta</h3>
            </div>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{cuenta.username}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{cuenta.rol}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{cuenta.estado}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correo empresarial</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{cuenta.email_empresarial}</dd>
                <p className="mt-0.5 text-xs text-slate-500">
                  Es el correo de la empresa: solo lo cambia el administrador.
                </p>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Último acceso</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">
                  {cuenta.ultimo_acceso ? fmtFechaHora(cuenta.ultimo_acceso) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cuenta creada</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">
                  {cuenta.creado_en ? fmtFechaHora(cuenta.creado_en) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Ficha del trabajador: los campos editables. */}
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <IdentificationIcon className="h-5 w-5 text-brand-600" />
              <h3 className="text-base font-semibold text-slate-900">Mis datos de trabajador</h3>
            </div>

            {!trabajador ? (
              <p className="mt-4 rounded-xl bg-accent-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-accent-200">
                Esta cuenta todavía no está asociada a una ficha de trabajador. Pida al
                administrador que la vincule para poder editar estos datos.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  Edite su teléfono, correo de contacto y dirección. El número de documento, el
                  cargo y la especialidad no se editan aquí: el documento es la identidad de su
                  ficha, y el cargo y la especialidad los asigna el administrador desde el catálogo.
                </p>
                <form onSubmit={guardarDatos} className="mt-5 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="mi-nombre" className="label">Nombre completo</label>
                      <input id="mi-nombre" className="input-readonly" disabled
                        value={`${trabajador.nombres} ${trabajador.apellidos}`} />
                    </div>
                    <div>
                      <label htmlFor="mi-tipo" className="label">Tipo de documento</label>
                      <input id="mi-tipo" className="input-readonly" disabled value={trabajador.tipo_documento ?? ''} />
                    </div>
                    <div>
                      <label htmlFor="mi-documento" className="label">Número de documento</label>
                      <input id="mi-documento" className="input-readonly" disabled
                        value={trabajador.numero_documento ?? ''} />
                      <p className="mt-0.5 text-xs text-slate-500">
                        Solo lectura: el número de documento no se puede modificar.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="mi-telefono" className="label">Teléfono</label>
                      <TelefonoPais
                        id="mi-telefono"
                        value={datos.telefono}
                        onChange={(v) => setDatos({ ...datos, telefono: v })}
                        error={errorCampo === 'telefono'}
                      />
                    </div>
                    <div>
                      <label htmlFor="mi-email" className="label">Correo de contacto</label>
                      <input id="mi-email" type="email" maxLength={150} className={campo('email')} value={datos.email}
                        onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="mi-direccion" className="label">Dirección</label>
                      <div className="flex gap-2">
                        <input
                          id="mi-direccion"
                          maxLength={255}
                          className={campo('direccion')}
                          placeholder="Escriba la dirección o selecciónela en el mapa"
                          value={datos.direccion}
                          onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
                        />
                        <button
                          type="button"
                          className="btn-ghost shrink-0"
                          onClick={() => setMapaAbierto(true)}
                        >
                          <MapPinIcon className="h-4 w-4" /> Mapa
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="mi-cargo" className="label">Cargo</label>
                      <input id="mi-cargo" className="input-readonly" disabled value={trabajador.cargo ?? ''} />
                    </div>
                    <div>
                      <label htmlFor="mi-especialidad" className="label">Especialidad</label>
                      <input id="mi-especialidad" className="input-readonly" disabled value={trabajador.especialidad ?? 'Sin especialidad'} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                    <button type="submit" disabled={guardandoDatos} className="btn-primary disabled:opacity-60">
                      {guardandoDatos ? 'Guardando…' : 'Guardar mis datos'}
                    </button>
                    <span className="text-xs text-slate-500">
                      Los cambios quedan registrados en la bitácora de trazabilidad.
                    </span>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Contraseña personal. */}
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5 text-brand-600" />
              <h3 className="text-base font-semibold text-slate-900">Cambiar mi contraseña</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Mínimo 8 caracteres. Debe escribir su contraseña actual para confirmar el cambio.
            </p>

            <form onSubmit={cambiarClave} className="mt-5 space-y-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label htmlFor="mi-clave-actual" className="label">Contraseña actual</label>
                  <CampoPassword id="mi-clave-actual" autoComplete="current-password"
                    value={clave.password_actual}
                    onChange={(e) => setClave({ ...clave, password_actual: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="mi-clave-nueva" className="label">Nueva contraseña</label>
                  <CampoPassword id="mi-clave-nueva" autoComplete="new-password"
                    minLength={8} value={clave.password}
                    onChange={(e) => setClave({ ...clave, password: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="mi-clave-repetir" className="label">Confirmar nueva contraseña</label>
                  <CampoPassword id="mi-clave-repetir" autoComplete="new-password"
                    minLength={8} value={clave.repetir}
                    onChange={(e) => setClave({ ...clave, repetir: e.target.value })} required />
                </div>
              </div>

              {errorClave && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorClave}
                </p>
              )}

              <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                <button type="submit" disabled={guardandoClave} className="btn-primary disabled:opacity-60">
                  {guardandoClave ? 'Cambiando…' : 'Cambiar contraseña'}
                </button>
                <button type="button" className="btn-ghost"
                  onClick={() => { setClave(VACIO_CLAVE); setErrorClave('') }}>
                  Limpiar
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
