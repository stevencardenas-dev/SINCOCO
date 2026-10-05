import { useState } from 'react'
import {
  ArrowPathIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  RectangleStackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SelectorUbicacion from '../components/SelectorUbicacion.jsx'
import TelefonoPais, { telefonoLegible } from '../components/TelefonoPais.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import { catalogosApi } from '../services/catalogos'
import { clientesApi } from '../services/clientes'
import { useRecurso } from '../hooks/useRecurso'
import { useFormulario } from '../hooks/useFormulario'
import { useAuth } from '../context/AuthContext.jsx'
import { CATEGORIAS, SIN_CATEGORIA } from '../lib/catalogos.js'

/**
 * Gestión Administrativa (RF01 · RF06 · RF02): mantiene los valores de dominio
 * que usan las demás pantallas —cargos de la empresa, especialidades del
 * personal y clientes— desde un solo lugar. La administran el administrador y
 * el gerente (`catalogos.listar` / `catalogos.gestionar`).
 *
 * Cada pestaña administra una lista: crear, editar y "eliminar". Eliminar es la
 * baja lógica de HU-18 · RN07 (nunca borrado físico): el valor deja de
 * aparecer en los formularios, los registros que ya lo usaban conservan el dato
 * y se puede reactivar más adelante.
 *
 * Los cargos marcan `operativo`: para esos cargos la especialidad es
 * obligatoria (criterio 2 de HU-04), y la regla la lee el backend del catálogo,
 * no del código.
 *
 * Cargos y especialidades llevan una categoría (lib/catalogos.js) con la que
 * Personal agrupa sus selectores; lo que no la tiene aparece en «Otros».
 */

const TABS = [
  {
    id: 'cargos',
    label: 'Cargos',
    servicio: catalogosApi.cargos,
    etiqueta: 'cargo',
    articulo: 'el',
    nuevo: 'Nuevo cargo',
    descripcion:
      'Cargos de la empresa. Los marcados como de obra exigen especialidad al registrar personal.',
  },
  {
    id: 'especialidades',
    label: 'Especialidades',
    servicio: catalogosApi.especialidades,
    etiqueta: 'especialidad',
    articulo: 'la',
    nuevo: 'Nueva especialidad',
    descripcion: 'Especialidades del personal de obra y administrativo.',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    servicio: clientesApi,
    etiqueta: 'cliente',
    articulo: 'el',
    nuevo: 'Nuevo cliente',
    descripcion: 'Clientes que se pueden asociar a los proyectos.',
  },
]

const VACIO = {
  cargos: { nombre: '', descripcion: '', categoria: '', operativo: false },
  especialidades: { nombre: '', descripcion: '', categoria: '' },
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
  const { puede } = useAuth()
  // Ver el módulo lo decide `catalogos.listar` (la ruta); operarlo, `catalogos.gestionar`.
  const puedeGestionar = puede('catalogos.gestionar')
  const [tipo, setTipo] = useState('cargos')
  const [incluirInactivos, setIncluirInactivos] = useState(false)

  const [mapaAbierto, setMapaAbierto] = useState(false)
  const [porEliminar, setPorEliminar] = useState(null)

  const tab = TABS.find((t) => t.id === tipo)

  // Al cambiar de pestaña se vacía la tabla: las columnas de un catálogo no
  // sirven para las filas de otro.
  const { datos, error, aviso, setAviso, limpiarMensajes, recargar, ejecutar } = useRecurso(
    () => tab.servicio.listar({ incluirInactivos }),
    [tipo, incluirInactivos],
    { mensaje: `No se pudo cargar el catálogo de ${tab.label.toLowerCase()}.`, reiniciar: true },
  )

  /** Lo que se envía de cada catálogo (el documento de un cliente no se edita). */
  const cuerpo = (form, editando) => {
    if (tipo === 'clientes') {
      if (!editando) return form
      const { tipo_documento, razon_social_nombre, nombre_contacto, telefono, email, direccion } = form
      return { tipo_documento, razon_social_nombre, nombre_contacto, telefono, email, direccion }
    }
    return {
      nombre: form.nombre,
      descripcion: form.descripcion,
      categoria: form.categoria || null,
      ...(tipo === 'cargos' ? { operativo: form.operativo } : {}),
    }
  }

  // `registro` es la fila que se edita (null = registro nuevo).
  const formulario = useFormulario(VACIO[tipo], {
    enviar: (form, fila) =>
      fila ? tab.servicio.actualizar(fila.id, cuerpo(form, true)) : tab.servicio.crear(cuerpo(form, false)),
    alGuardar: (_, { registro }) => {
      setAviso(registro ? 'Registro actualizado.' : 'Registro agregado al catálogo.')
      return recargar()
    },
    error: 'No se pudo guardar el registro.',
  })
  const form = formulario.valores
  const editando = formulario.registro !== null

  const abrirEditar = (fila) =>
    formulario.abrir(
      { ...VACIO[tipo], ...fila, ...(tipo !== 'clientes' ? { categoria: fila.categoria ?? '' } : {}) },
      fila,
    )

  /** Eliminar = baja lógica (HU-18): el registro deja de ofrecerse, pero no se borra. */
  const eliminar = async () => {
    const fila = porEliminar
    setPorEliminar(null)
    await ejecutar(() => tab.servicio.baja(fila.id), {
      exito: `Se dio de baja ${tab.articulo} ${tab.etiqueta} "${nombreDe(fila)}".`,
      error: 'No se pudo dar de baja el registro.',
    })
  }

  const reactivar = (fila) =>
    ejecutar(() => tab.servicio.reactivar(fila.id), {
      exito: `Se reactivó ${tab.articulo} ${tab.etiqueta} "${nombreDe(fila)}".`,
      error: 'No se pudo reactivar el registro.',
    })

  const campo = formulario.claseCampo

  const nombreDe = (fila) => fila.nombre ?? fila.razon_social_nombre ?? ''

  const totalActivos = (datos ?? []).filter((f) => Number(f.activo) === 1).length

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargar} />}
        title="Gestión Administrativa"
        subtitle="Cargos, especialidades y clientes de la empresa"
      >
        {puedeGestionar && (
          <button type="button" className="btn-primary" onClick={() => formulario.abrir()}>
            <PlusIcon className="h-5 w-5" /> {tab.nuevo}
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
      </PageHeader>

      {/* Pestañas: un catálogo a la vez, misma mecánica para los tres. */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTipo(t.id); limpiarMensajes() }}
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
          <TablaFicha
            filas={datos}
            minWidth="md:min-w-[760px]"
            filaClase={(f) => `transition hover:bg-slate-50/70 ${f.activo ? '' : 'bg-slate-50/60'}`}
            ficha={{
              titulo: nombreDe,
              subtitulo: () => tab.etiqueta,
              extras: (f) =>
                tipo === 'clientes'
                  ? [
                      ['Correo', f.email],
                      ['Dirección', f.direccion],
                    ]
                  : [],
            }}
            columnas={[
              {
                titulo: tipo === 'clientes' ? 'Cliente' : 'Nombre',
                movil: true,
                celda: (f) => (
                  <>
                    <p className="font-semibold text-slate-800">{nombreDe(f)}</p>
                    {tipo === 'cargos' && Number(f.operativo) === 1 && (
                      <span className="badge mt-1 bg-accent-50 text-brand-700 ring-1 ring-accent-200">
                        Cargo de obra
                      </span>
                    )}
                  </>
                ),
              },
              ...(tipo === 'clientes'
                ? [
                    {
                      titulo: 'Documento',
                      movil: true,
                      tdClase: 'text-slate-600',
                      celda: (f) => `${f.tipo_documento} ${f.numero_documento}`,
                    },
                    {
                      titulo: 'Contacto',
                      tdClase: 'text-slate-600',
                      celda: (f) => (
                        <>
                          {f.nombre_contacto ?? '—'}
                          {f.telefono && <p className="text-xs text-slate-400">{telefonoLegible(f.telefono)}</p>}
                        </>
                      ),
                    },
                  ]
                : [
                    {
                      titulo: 'Categoría',
                      movil: true,
                      tdClase: 'text-slate-600',
                      celda: (f) =>
                        f.categoria ?? <span className="text-slate-400">{SIN_CATEGORIA}</span>,
                    },
                    {
                      titulo: 'Descripción',
                      movil: true,
                      tdClase: 'max-w-md text-slate-600',
                      celda: (f) => f.descripcion ?? '—',
                    },
                    {
                      titulo: 'En uso',
                      tdClase: 'text-slate-600',
                      celda: (f) =>
                        Number(f.en_uso) > 0
                          ? `${f.en_uso} ${Number(f.en_uso) === 1 ? 'trabajador' : 'trabajadores'}`
                          : '—',
                    },
                  ]),
              {
                titulo: 'Estado',
                celda: (f) => (
                  <span
                    className={`badge ring-1 ${
                      f.activo
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                    }`}
                  >
                    {f.activo ? 'Activo' : 'Dado de baja'}
                  </span>
                ),
              },
              ...(puedeGestionar
                ? [
                    {
                      titulo: 'Acciones',
                      acciones: true,
                      derecha: true,
                      celda: (f, enFicha) => {
                        const botones = (
                          <>
                            <button type="button" className="btn-ghost text-xs" onClick={() => abrirEditar(f)}>
                              <PencilSquareIcon className="h-4 w-4" /> Editar
                            </button>
                            {f.activo ? (
                              <button type="button" className="btn-ghost text-xs" onClick={() => setPorEliminar(f)}>
                                <TrashIcon className="h-4 w-4" /> Eliminar
                              </button>
                            ) : (
                              <button type="button" className="btn-ghost text-xs" onClick={() => reactivar(f)}>
                                <ArrowPathIcon className="h-4 w-4" /> Reactivar
                              </button>
                            )}
                          </>
                        )
                        return enFicha ? botones : <div className="flex items-center justify-end gap-2">{botones}</div>
                      },
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}

      {/* Crear / editar un registro del catálogo */}
      <ModalFormulario
        {...formulario.propsModal}
        titulo={`${editando ? 'Editar' : 'Nuevo'} ${tab.etiqueta}`}
        subtitulo="Los cambios aplican de inmediato en los formularios del sistema"
        textoGuardar={editando ? 'Guardar cambios' : 'Agregar'}
        espaciado="space-y-4"
      >
        {tipo === 'clientes' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cat-tipo-doc" className="label">Tipo de documento</label>
                <select id="cat-tipo-doc" className="input" value={form.tipo_documento}
                  onChange={(e) => formulario.cambiar('tipo_documento', e.target.value)}>
                  {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cat-documento" className="label">Documento</label>
                <input id="cat-documento" className="input" maxLength={20} value={form.numero_documento}
                  onChange={(e) => formulario.cambiar('numero_documento', e.target.value)}
                  disabled={editando} required />
                {editando && (
                  <p className="mt-1 text-xs text-slate-500">
                    El documento identifica al cliente y no se edita.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="cat-razon" className="label">Razón social / nombre</label>
              <input id="cat-razon" className="input" maxLength={150} value={form.razon_social_nombre}
                onChange={(e) => formulario.cambiar('razon_social_nombre', e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cat-contacto" className="label">Nombre del contacto</label>
                <input id="cat-contacto" className="input" value={form.nombre_contacto}
                  onChange={(e) => formulario.cambiar('nombre_contacto', e.target.value)} />
              </div>
              <div>
                <label htmlFor="cat-telefono" className="label">Teléfono</label>
                <TelefonoPais id="cat-telefono" value={form.telefono}
                  onChange={(v) => formulario.cambiar('telefono', v)}
                  error={formulario.campo === 'telefono'} />
              </div>
              <div>
                <label htmlFor="cat-email" className="label">Correo</label>
                <input id="cat-email" type="email" maxLength={150} autoComplete="email"
                  placeholder="nombre@correo.com" className={campo('email')} value={form.email}
                  onChange={(e) => formulario.cambiar('email', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cat-direccion" className="label">Dirección</label>
                <div className="flex gap-2">
                  <input id="cat-direccion" maxLength={255} className="input"
                    placeholder="Escriba la dirección o selecciónela en el mapa"
                    value={form.direccion}
                    onChange={(e) => formulario.cambiar('direccion', e.target.value)} />
                  <button type="button" className="btn-ghost shrink-0" onClick={() => setMapaAbierto(true)}>
                    <MapPinIcon className="h-4 w-4" /> Mapa
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="cat-nombre" className="label">Nombre</label>
              <input id="cat-nombre" className="input" maxLength={100} value={form.nombre} required minLength={3}
                onChange={(e) => formulario.cambiar('nombre', e.target.value)} />
            </div>
            <div>
              <label htmlFor="cat-descripcion" className="label">Descripción</label>
              <input id="cat-descripcion" className="input" maxLength={255} value={form.descripcion}
                onChange={(e) => formulario.cambiar('descripcion', e.target.value)} />
            </div>
            <div>
              <label htmlFor="cat-categoria" className="label">Categoría</label>
              <select id="cat-categoria" className="input" value={form.categoria}
                onChange={(e) => formulario.cambiar('categoria', e.target.value)}>
                <option value="">Sin categoría (aparece en «{SIN_CATEGORIA}»)</option>
                {CATEGORIAS[tipo].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Agrupa este valor en los selectores del formulario de personal.
              </p>
            </div>
            {tipo === 'cargos' && (
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  checked={Boolean(form.operativo)}
                  onChange={(e) => formulario.cambiar('operativo', e.target.checked)} />
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
      </ModalFormulario>

      {/* Mapa para la dirección del cliente: devuelve el texto normalizado al formulario. */}
      <SelectorUbicacion
        abierto={mapaAbierto}
        valorInicial={form.direccion}
        onCerrar={() => setMapaAbierto(false)}
        onAceptar={(texto) => {
          formulario.cambiar('direccion', texto)
          setMapaAbierto(false)
        }}
      />

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
        {porEliminar && Number(porEliminar.proyectos_activos) > 0 && (
          <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            Este cliente está asignado a {porEliminar.proyectos_activos}{' '}
            {Number(porEliminar.proyectos_activos) === 1 ? 'proyecto activo' : 'proyectos activos'}.
            Los proyectos conservarán el cliente, pero no podrá elegirse en proyectos nuevos.
            ¿Desea eliminarlo de todos modos?
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
