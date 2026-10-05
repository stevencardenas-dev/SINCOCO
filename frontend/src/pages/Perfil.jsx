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
import BotonActualizar from '../components/BotonActualizar.jsx'
import SelectorUbicacion from '../components/SelectorUbicacion.jsx'
import TelefonoPais from '../components/TelefonoPais.jsx'
import { perfilApi } from '../services/perfil'
import { useRecurso } from '../hooks/useRecurso'
import { useFormulario } from '../hooks/useFormulario'
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
 * administrador en Usuarios y Gestión Administrativa.
 */

const VACIO_DATOS = { telefono: '', email: '', direccion: '' }
const VACIO_CLAVE = { password_actual: '', password: '', repetir: '' }

export default function Perfil() {
  const {
    datos: perfil,
    setDatos: setPerfil,
    error: errorCarga,
    aviso,
    setAviso,
    recargar,
  } = useRecurso(perfilApi.obtener, [], { mensaje: 'No se pudo cargar su información personal.' })

  // Selector de ubicación en el mapa (Leaflet) para la dirección.
  const [mapaAbierto, setMapaAbierto] = useState(false)

  // Datos de contacto: el formulario sigue a la vista después de guardar.
  const misDatos = useFormulario(VACIO_DATOS, {
    enviar: (f) => perfilApi.actualizar(f),
    alGuardar: (perfilActualizado) => {
      setPerfil(perfilActualizado)
      setAviso('Su información se actualizó correctamente.')
    },
    error: 'No se pudo guardar su información.',
    cerrarAlGuardar: false,
  })
  const datos = misDatos.valores
  // El error de los datos se muestra arriba, junto al de la carga.
  const error = errorCarga || misDatos.error

  const clave = useFormulario(VACIO_CLAVE, {
    // RNF04: la validación también está en el backend; aquí se avisa antes.
    validar: (f) => f.password !== f.repetir && 'La contraseña nueva y su confirmación no coinciden.',
    enviar: (f) => perfilApi.actualizar({ password_actual: f.password_actual, password: f.password }),
    alGuardar: () => setAviso('Contraseña actualizada. Úsela en el próximo ingreso.'),
    error: 'No se pudo cambiar la contraseña.',
  })

  // El formulario se llena con lo último que devolvió la API (al cargar y al guardar).
  useEffect(() => {
    if (!perfil) return
    misDatos.setValores({
      telefono: perfil.trabajador?.telefono ?? '',
      email: perfil.trabajador?.email ?? '',
      direccion: perfil.trabajador?.direccion ?? '',
    })
  }, [perfil])

  const guardarDatos = (e) => {
    setAviso('')
    return misDatos.guardar(e)
  }

  const cambiarClave = (e) => {
    setAviso('')
    return clave.guardar(e)
  }

  const campo = misDatos.claseCampo
  const cuenta = perfil?.usuario
  const trabajador = perfil?.trabajador

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargar} />}
        title="Mi información personal"
        subtitle="Sus datos de acceso y su ficha de trabajador"
      >
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
          misDatos.cambiar('direccion', texto)
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
                        onChange={(v) => misDatos.cambiar('telefono', v)}
                        error={misDatos.campo === 'telefono'}
                      />
                    </div>
                    <div>
                      <label htmlFor="mi-email" className="label">Correo de contacto</label>
                      <input id="mi-email" type="email" maxLength={150} className={campo('email')} value={datos.email}
                        onChange={(e) => misDatos.cambiar('email', e.target.value)} />
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
                          onChange={(e) => misDatos.cambiar('direccion', e.target.value)}
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
                    <button type="submit" disabled={misDatos.guardando} className="btn-primary disabled:opacity-60">
                      {misDatos.guardando ? 'Guardando…' : 'Guardar mis datos'}
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
                    value={clave.valores.password_actual}
                    onChange={(e) => clave.cambiar('password_actual', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="mi-clave-nueva" className="label">Nueva contraseña</label>
                  <CampoPassword id="mi-clave-nueva" autoComplete="new-password"
                    minLength={8} value={clave.valores.password}
                    onChange={(e) => clave.cambiar('password', e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="mi-clave-repetir" className="label">Confirmar nueva contraseña</label>
                  <CampoPassword id="mi-clave-repetir" autoComplete="new-password"
                    minLength={8} value={clave.valores.repetir}
                    onChange={(e) => clave.cambiar('repetir', e.target.value)} required />
                </div>
              </div>

              {clave.error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {clave.error}
                </p>
              )}

              <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                <button type="submit" disabled={clave.guardando} className="btn-primary disabled:opacity-60">
                  {clave.guardando ? 'Cambiando…' : 'Cambiar contraseña'}
                </button>
                <button type="button" className="btn-ghost"
                  onClick={clave.cerrar}>
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
