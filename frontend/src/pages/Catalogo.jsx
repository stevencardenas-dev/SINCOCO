import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  PencilSquareIcon,
  PlusIcon,
  RectangleStackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import Ficha, { CeldaFicha, EncabezadoFicha } from '../components/Ficha.jsx'
import PageHeader from '../components/PageHeader.jsx'
import api from '../services/api'

/**
 * Catálogo (RF01 · RF06 · RF02): mantiene los valores de dominio que usan las
 * demás pantallas —cargos de la empresa, especialidades del personal y
 * clientes— desde un solo lugar.
 *
 * Cada pestaña administra una lista: crear, editar y "eliminar". Eliminar es la
 * baja lógica de HU-18 · RN07 (nunca borrado físico): el valor deja de
 * aparecer en los formularios, los registros que ya lo usaban conservan el dato
 * y se puede reactivar más adelante.
 *
 * Los cargos marcan `operativo`: para esos cargos la especialidad es
 * obligatoria (criterio 2 de HU-04), y la regla la lee el backend del catálogo,
 * no del código.
 */

const TABS = [
  {
    id: 'cargos',
    label: 'Cargos',
    ruta: '/catalogos/cargos',
    etiqueta: 'cargo',
    articulo: 'el',
    nuevo: 'Nuevo cargo',
    descripcion:
      'Cargos de la empresa. Los marcados como de obra exigen especialidad al registrar personal.',
  },
  {
    id: 'especialidades',
    label: 'Especialidades',
    ruta: '/catalogos/especialidades',
    etiqueta: 'especialidad',
    articulo: 'la',
    nuevo: 'Nueva especialidad',
    descripcion: 'Especialidades del personal de obra y administrativo.',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    ruta: '/clientes',
    etiqueta: 'cliente',
    articulo: 'el',
    nuevo: 'Nuevo cliente',
    descripcion: 'Clientes que se pueden asociar a los proyectos.',
  },
]

const VACIO = {
  cargos: { nombre: '', descripcion: '', operativo: false },
  especialidades: { nombre: '', descripcion: '' },
  clientes: {
    tipo_documento: 'NIT',
    numero_documento: '',
    razon_social_nombre: '',
    nombre_contacto: '',
    telefono: '',
    email: '',
    direccion: '',
  },
}

const TIPOS_DOCUMENTO = ['NIT', 'CC', 'CE', 'PASAPORTE']

export default function Catalogo() {
  const [tipo, setTipo] = useState('cargos')
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)

  const [modal, setModal] = useState(null) // 'crear' | 'editar'
  const [form, setForm] = useState(VACIO.cargos)
  const [errorForm, setErrorForm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [porEliminar, setPorEliminar] = useState(null)
  // Celular: la tabla conserva Nombre y Descripción; el resto va en la ficha.
  const [ficha, setFicha] = useState(null)

  const tab = TABS.find((t) => t.id === tipo)

  const cargar = () => {
    setError('')
    setDatos(null)
    return api
      .get(tab.ruta, { params: incluirInactivos ? { incluirInactivos: 1 } : {} })
      .then((res) => setDatos(res.data))
      .catch(() => setError(`No se pudo cargar el catálogo de ${tab.label.toLowerCase()}.`))
  }

  useEffect(() => {
    cargar()
  }, [tipo, incluirInactivos])

  const abrirCrear = () => {
    setForm(VACIO[tipo])
    setErrorForm('')
    setModal('crear')
  }

  const abrirEditar = (fila) => {
    setForm({ ...VACIO[tipo], ...fila })
    setErrorForm('')
    setModal('editar')
  }

  const cerrarModal = () => {
    setModal(null)
    setErrorForm('')
  }

  const guardar = async (e) => {
    e.preventDefault()
    setErrorForm('')
    setGuardando(true)
    try {
      if (tipo === 'clientes') {
        if (modal === 'editar') {
          await api.patch(`${tab.ruta}/${form.id}`, {
            tipo_documento: form.tipo_documento,
            razon_social_nombre: form.razon_social_nombre,
            nombre_contacto: form.nombre_contacto,
            telefono: form.telefono,
            email: form.email,
            direccion: form.direccion,
          })
        } else {
          await api.post(tab.ruta, form)
        }
      } else if (modal === 'editar') {
        await api.patch(`${tab.ruta}/${form.id}`, {
          nombre: form.nombre,
          descripcion: form.descripcion,
          ...(tipo === 'cargos' ? { operativo: form.operativo } : {}),
        })
      } else {
        await api.post(tab.ruta, {
          nombre: form.nombre,
          descripcion: form.descripcion,
          ...(tipo === 'cargos' ? { operativo: form.operativo } : {}),
        })
      }

      setAviso(modal === 'editar' ? 'Registro actualizado.' : 'Registro agregado al catálogo.')
      cerrarModal()
      cargar()
    } catch (err) {
      setErrorForm(err.response?.data?.error ?? 'No se pudo guardar el registro.')
    } finally {
      setGuardando(false)
    }
  }

  /** Eliminar = baja lógica (HU-18): el registro deja de ofrecerse, pero no se borra. */
  const eliminar = async () => {
    const fila = porEliminar
    setPorEliminar(null)
    setError('')
    setAviso('')
    try {
      await api.patch(`${tab.ruta}/${fila.id}/baja`)
      setAviso(`Se dio de baja ${tab.articulo} ${tab.etiqueta} "${nombreDe(fila)}".`)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo dar de baja el registro.')
    }
  }

  const reactivar = async (fila) => {
    setError('')
    setAviso('')
    try {
      await api.patch(`${tab.ruta}/${fila.id}/reactivar`)
      setAviso(`Se reactivó ${tab.articulo} ${tab.etiqueta} "${nombreDe(fila)}".`)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo reactivar el registro.')
    }
  }

  const nombreDe = (fila) => fila.nombre ?? fila.razon_social_nombre ?? ''

  const totalActivos = (datos ?? []).filter((f) => Number(f.activo) === 1).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo"
        subtitle="Cargos, especialidades y clientes de la empresa"
      >
        <button type="button" className="btn-primary" onClick={abrirCrear}>
          <PlusIcon className="h-5 w-5" /> {tab.nuevo}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
        <BotonActualizar onClick={cargar} />
      </PageHeader>

      {/* Pestañas: un catálogo a la vez, misma mecánica para los tres. */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTipo(t.id); setAviso(''); setError('') }}
            className={`-mb-px rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
              t.id === tipo
                ? 'border-b-2 border-accent-400 text-brand-900'
                : 'text-slate-500 hover:text-brand-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">{tab.descripcion}</p>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      )}
      {aviso && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{aviso}</p>
      )}

      {datos === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando catálogo…
        </div>
      )}

      {datos !== null && datos.length === 0 && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <RectangleStackIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">El catálogo está vacío</p>
          <p className="text-xs text-slate-500">Use «{tab.nuevo}» para agregar el primer registro.</p>
        </div>
      )}

      {datos !== null && datos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>{totalActivos} activos de {datos.length} registros</span>
            <span>Los registros en uso conservan el dato aunque se den de baja</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm md:min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold md:px-5 md:py-3.5">{tipo === 'clientes' ? 'Cliente' : 'Nombre'}</th>
                  {tipo === 'clientes' ? (
                    <>
                      <th className="px-3 py-3 font-semibold md:px-5 md:py-3.5">Documento</th>
                      <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Contacto</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3 font-semibold md:px-5 md:py-3.5">Descripción</th>
                      <th className="hidden px-5 py-3.5 font-semibold md:table-cell">En uso</th>
                    </>
                  )}
                  <th className="hidden px-5 py-3.5 font-semibold md:table-cell">Estado</th>
                  <th className="hidden px-5 py-3.5 text-right font-semibold md:table-cell">Acciones</th>
                  <EncabezadoFicha />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.map((fila) => (
                  <tr key={fila.id} className={`transition hover:bg-slate-50/70 ${fila.activo ? '' : 'bg-slate-50/60'}`}>
                    <td className="px-3 py-3 md:px-5 md:py-4">
                      <p className="font-semibold text-slate-800">{nombreDe(fila)}</p>
                      {tipo === 'cargos' && Number(fila.operativo) === 1 && (
                        <span className="badge mt-1 bg-accent-50 text-brand-700 ring-1 ring-accent-200">
                          Cargo de obra
                        </span>
                      )}
                    </td>
                    {tipo === 'clientes' ? (
                      <>
                        <td className="px-3 py-3 text-slate-600 md:px-5 md:py-4">
                          {fila.tipo_documento} {fila.numero_documento}
                        </td>
                        <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                          {fila.nombre_contacto ?? '—'}
                          {fila.telefono && <p className="text-xs text-slate-400">{fila.telefono}</p>}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="max-w-md px-3 py-3 text-slate-600 md:px-5 md:py-4">{fila.descripcion ?? '—'}</td>
                        <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                          {Number(fila.en_uso) > 0
                            ? `${fila.en_uso} ${Number(fila.en_uso) === 1 ? 'trabajador' : 'trabajadores'}`
                            : '—'}
                        </td>
                      </>
                    )}
                    <td className="hidden px-5 py-4 md:table-cell">
                      <span className={`badge ring-1 ${
                        fila.activo
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-slate-100 text-slate-500 ring-slate-200'
                      }`}>
                        {fila.activo ? 'Activo' : 'Dado de baja'}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 md:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => abrirEditar(fila)}
                        >
                          <PencilSquareIcon className="h-4 w-4" /> Editar
                        </button>
                        {fila.activo ? (
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            onClick={() => setPorEliminar(fila)}
                          >
                            <TrashIcon className="h-4 w-4" /> Eliminar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            onClick={() => reactivar(fila)}
                          >
                            <ArrowPathIcon className="h-4 w-4" /> Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                    <CeldaFicha onClick={() => setFicha(fila)} etiqueta={nombreDe(fila)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ficha && (
        <Ficha
          abierto
          titulo={nombreDe(ficha)}
          subtitulo={tab.etiqueta}
          onCerrar={() => setFicha(null)}
          campos={
            tipo === 'clientes'
              ? [
                  ['Documento', `${ficha.tipo_documento} ${ficha.numero_documento}`],
                  ['Contacto', ficha.nombre_contacto],
                  ['Teléfono', ficha.telefono],
                  ['Correo', ficha.email],
                  ['Dirección', ficha.direccion],
                  ['Estado', ficha.activo ? 'Activo' : 'Dado de baja'],
                ]
              : [
                  ['Descripción', ficha.descripcion],
                  ...(tipo === 'cargos' ? [['Cargo de obra', Number(ficha.operativo) === 1 ? 'Sí' : 'No']] : []),
                  [
                    'En uso',
                    Number(ficha.en_uso) > 0
                      ? `${ficha.en_uso} ${Number(ficha.en_uso) === 1 ? 'trabajador' : 'trabajadores'}`
                      : null,
                  ],
                  ['Estado', ficha.activo ? 'Activo' : 'Dado de baja'],
                ]
          }
        >
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => {
              const f = ficha
              setFicha(null)
              abrirEditar(f)
            }}
          >
            <PencilSquareIcon className="h-4 w-4" /> Editar
          </button>
          {ficha.activo ? (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                const f = ficha
                setFicha(null)
                setPorEliminar(f)
              }}
            >
              <TrashIcon className="h-4 w-4" /> Eliminar
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                const f = ficha
                setFicha(null)
                reactivar(f)
              }}
            >
              <ArrowPathIcon className="h-4 w-4" /> Reactivar
            </button>
          )}
        </Ficha>
      )}

      {/* Crear / editar un registro del catálogo */}
      <Modal
        abierto={modal !== null}
        titulo={`${modal === 'editar' ? 'Editar' : 'Nuevo'} ${tab.etiqueta}`}
        subtitulo="Los cambios aplican de inmediato en los formularios del sistema"
        onCerrar={cerrarModal}
      >
        <form onSubmit={guardar} className="space-y-4">
          {tipo === 'clientes' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cat-tipo-doc" className="label">Tipo de documento</label>
                  <select id="cat-tipo-doc" className="input" value={form.tipo_documento}
                    onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>
                    {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cat-documento" className="label">Documento</label>
                  <input id="cat-documento" className="input" maxLength={20} value={form.numero_documento}
                    onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
                    disabled={modal === 'editar'} required />
                  {modal === 'editar' && (
                    <p className="mt-1 text-xs text-slate-500">
                      El documento identifica al cliente y no se edita.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="cat-razon" className="label">Razón social / nombre</label>
                <input id="cat-razon" className="input" maxLength={150} value={form.razon_social_nombre}
                  onChange={(e) => setForm({ ...form, razon_social_nombre: e.target.value })} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cat-contacto" className="label">Nombre del contacto</label>
                  <input id="cat-contacto" className="input" value={form.nombre_contacto}
                    onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="cat-telefono" className="label">Teléfono</label>
                  <input id="cat-telefono" className="input" value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="cat-email" className="label">Correo</label>
                  <input id="cat-email" type="email" className="input" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="cat-direccion" className="label">Dirección</label>
                  <input id="cat-direccion" className="input" value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="cat-nombre" className="label">Nombre</label>
                <input id="cat-nombre" className="input" maxLength={100} value={form.nombre} required minLength={3}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label htmlFor="cat-descripcion" className="label">Descripción</label>
                <input id="cat-descripcion" className="input" maxLength={255} value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              {tipo === 'cargos' && (
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    checked={Boolean(form.operativo)}
                    onChange={(e) => setForm({ ...form, operativo: e.target.checked })} />
                  <span>
                    Es cargo de obra
                    <span className="block text-xs text-slate-500">
                      Para estos cargos la especialidad es obligatoria al registrar personal.
                    </span>
                  </span>
                </label>
              )}
            </>
          )}

          {errorForm && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorForm}
            </p>
          )}

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
              {guardando ? 'Guardando…' : modal === 'editar' ? 'Guardar cambios' : 'Agregar'}
            </button>
            <button type="button" className="btn-ghost" onClick={cerrarModal}>Cancelar</button>
          </div>
        </form>
      </Modal>

      {/* Confirmación de eliminación (baja lógica) */}
      <Modal
        abierto={porEliminar !== null}
        titulo={`¿Eliminar ${tab.articulo} ${tab.etiqueta}?`}
        onCerrar={() => setPorEliminar(null)}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">
          «{porEliminar ? nombreDe(porEliminar) : ''}» dejará de aparecer en los formularios. No se
          borra de la base: se marca como dado de baja, los registros que ya lo usan conservan el
          dato y se puede reactivar.
        </p>
        {porEliminar && Number(porEliminar.en_uso) > 0 && (
          <p className="mt-3 rounded-xl bg-accent-50 px-4 py-3 text-xs text-brand-800 ring-1 ring-accent-200">
            Está en uso por {porEliminar.en_uso}{' '}
            {Number(porEliminar.en_uso) === 1 ? 'trabajador' : 'trabajadores'}: seguirán mostrándolo
            en su ficha.
          </p>
        )}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn-primary" onClick={eliminar}>Eliminar</button>
          <button type="button" className="btn-ghost" onClick={() => setPorEliminar(null)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  )
}
