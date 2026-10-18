import { useEffect, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  DocumentTextIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { proveedoresApi } from '../services/proveedores'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'
import { fmtFecha } from '../lib/format.js'
import { mensajeError } from '../lib/errores'

/**
 * HU-13: catálogo de proveedores y servicios externos.
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - el documento (NIT) es único y se valida en su formato;
 *   - razón social y datos de contacto son obligatorios;
 *   - se pueden adjuntar documentos de soporte (certificados, pólizas…);
 *   - solo un proveedor ACTIVO puede asociarse a nuevas órdenes o servicios:
 *     dar de baja lo deja INACTIVO.
 */

const VACIO = {
  documento_identificacion: '',
  razon_social: '',
  nombre_contacto: '',
  telefono: '',
  email: '',
  direccion: '',
}

const TIPOS_DOCUMENTO = [
  { value: 'CERTIFICADO', label: 'Certificado' },
  { value: 'POLIZA', label: 'Póliza' },
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'RUT', label: 'RUT' },
  { value: 'OTRO', label: 'Otro' },
]

const TAMANO_MAXIMO = 5 * 1024 * 1024
const FORMATOS = ['application/pdf', 'image/png', 'image/jpeg']

const SIN_FILTROS = { buscar: '' }

const fmtTamano = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** Modal de documentos de soporte de un proveedor (criterio 3). */
function DocumentosProveedor({ proveedor, puedeAdjuntar, onCerrar, onCambio }) {
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState('')
  const [tipo, setTipo] = useState('CERTIFICADO')
  const [archivo, setArchivo] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [clave, setClave] = useState(0) // reinicia el input de archivo

  const cargar = () =>
    proveedoresApi
      .documentos(proveedor.id)
      .then(setDocs)
      .catch((e) => setError(mensajeError(e, 'No se pudieron cargar los documentos.')))

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedor.id])

  const elegir = (e) => {
    const f = e.target.files?.[0] ?? null
    setError('')
    if (f && !FORMATOS.includes(f.type)) {
      setError('Formato no permitido: solo PDF, PNG o JPG.')
      setArchivo(null)
      setClave((k) => k + 1)
      return
    }
    if (f && f.size > TAMANO_MAXIMO) {
      setError('El archivo supera el máximo de 5 MB.')
      setArchivo(null)
      setClave((k) => k + 1)
      return
    }
    setArchivo(f)
  }

  const adjuntar = async () => {
    if (!archivo) return
    setSubiendo(true)
    setError('')
    try {
      await proveedoresApi.adjuntar(proveedor.id, { tipo, archivo })
      setArchivo(null)
      setClave((k) => k + 1)
      await cargar()
      onCambio()
    } catch (e) {
      setError(mensajeError(e, 'No se pudo adjuntar el documento.'))
    } finally {
      setSubiendo(false)
    }
  }

  const descargar = async (d) => {
    try {
      const blob = await proveedoresApi.descargar(proveedor.id, d.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = d.nombre_archivo
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(mensajeError(e, 'No se pudo descargar el documento.'))
    }
  }

  const eliminar = async (d) => {
    if (!window.confirm(`¿Eliminar «${d.nombre_archivo}»?`)) return
    try {
      await proveedoresApi.eliminarDocumento(proveedor.id, d.id)
      await cargar()
      onCambio()
    } catch (e) {
      setError(mensajeError(e, 'No se pudo eliminar el documento.'))
    }
  }

  return (
    <Modal
      abierto
      titulo={`Documentos de ${proveedor.razon_social}`}
      onCerrar={() => !subiendo && onCerrar()}
      ancho="max-w-2xl"
    >
      {error && (
        <div className="mb-3">
          <AlertaFormulario mensaje={error} />
        </div>
      )}

      {puedeAdjuntar && proveedor.activo && (
        <div className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="doc-tipo" className="label">
              Tipo
            </label>
            <select id="doc-tipo" className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="doc-archivo" className="label">
              Archivo (PDF, PNG o JPG, máx. 5 MB)
            </label>
            <input
              key={clave}
              id="doc-archivo"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="input"
              onChange={elegir}
            />
          </div>
          <button type="button" className="btn-primary disabled:opacity-60" disabled={!archivo || subiendo} onClick={adjuntar}>
            <PaperClipIcon className="h-5 w-5" /> {subiendo ? 'Adjuntando…' : 'Adjuntar'}
          </button>
        </div>
      )}

      {docs === null && !error && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <ArrowPathIcon className="h-4 w-4 animate-spin" /> Cargando documentos…
        </p>
      )}
      {docs !== null && docs.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">Este proveedor aún no tiene documentos de soporte.</p>
      )}
      {docs !== null && docs.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2.5">
              <DocumentTextIcon className="h-6 w-6 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{d.nombre_archivo}</p>
                <p className="text-xs text-slate-500">
                  {TIPOS_DOCUMENTO.find((t) => t.value === d.tipo)?.label ?? d.tipo} · {fmtTamano(d.tamano)} ·{' '}
                  {fmtFecha(d.creado_en)}
                </p>
              </div>
              <button
                type="button"
                className="btn-accion btn-accion-editar"
                onClick={() => descargar(d)}
                aria-label={`Descargar ${d.nombre_archivo}`}
              >
                <ArrowDownTrayIcon className="h-4 w-4" /> Descargar
              </button>
              {puedeAdjuntar && (
                <button
                  type="button"
                  className="btn-accion"
                  onClick={() => eliminar(d)}
                  aria-label={`Eliminar ${d.nombre_archivo}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

export default function Proveedores() {
  const { puede } = useAuth()
  const puedeCrear = puede('proveedores.crear')
  const puedeEditar = puede('proveedores.editar')
  const puedeBaja = puede('proveedores.dar_baja')
  const puedeDocumentos = puede('proveedores.documentos')

  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [conDocumentos, setConDocumentos] = useState(null)
  const {
    filtros,
    cambiar: cambiarFiltro,
    limpiar: limpiarFiltros,
    activos: filtrosActivos,
    hayFiltros,
  } = useFiltros(SIN_FILTROS)

  const {
    datos: proveedores,
    error,
    setError,
    aviso,
    setAviso,
    recargar,
    ejecutar,
  } = useRecurso(
    () => proveedoresApi.listar({ incluirInactivos, buscar: filtros.buscar }),
    [incluirInactivos, filtros],
    { mensaje: 'No se pudo cargar el catálogo de proveedores.' },
  )

  /** Alta y edición. `registro` es el proveedor en edición (null = nuevo). */
  const formulario = useFormulario(VACIO, {
    enviar: (f, proveedor) =>
      proveedor ? proveedoresApi.actualizar(proveedor.id, f) : proveedoresApi.crear(f),
    alGuardar: ({ proveedor: p }, { registro }) => {
      setAviso(
        registro
          ? `${p.razon_social}: información actualizada.`
          : `${p.razon_social} registrado. Ya puede adjuntar sus documentos de soporte.`,
      )
      return recargar()
    },
    error: 'No se pudo guardar el proveedor.',
  })
  const form = formulario.valores
  const editando = formulario.registro
  const campo = formulario.claseCampo

  /** Confirmación de «Dar de baja» (`registro` es el proveedor). */
  const baja = useFormulario(null, {
    enviar: (_, p) => proveedoresApi.baja(p.id),
    alGuardar: (_, { registro: p }) => {
      formulario.cerrar()
      setError('')
      setAviso(`${p.razon_social} se dio de baja: no podrá asociarse a nuevas órdenes ni servicios.`)
      return recargar()
    },
    error: 'No se pudo dar de baja el proveedor.',
  })
  const porDarDeBaja = baja.registro

  const abrirEditar = (p) => {
    setAviso('')
    formulario.abrir(
      {
        documento_identificacion: p.documento_identificacion ?? '',
        razon_social: p.razon_social ?? '',
        nombre_contacto: p.nombre_contacto ?? '',
        telefono: p.telefono ?? '',
        email: p.email ?? '',
        direccion: p.direccion ?? '',
      },
      p,
    )
  }

  const reactivar = (p) =>
    ejecutar(() => proveedoresApi.reactivar(p.id), {
      exito: () => `Se reactivó ${p.razon_social}.`,
      error: 'No se pudo reactivar el proveedor.',
    })

  const texto = (id, etiqueta, nombre, props = {}, ayuda) => (
    <div>
      <label htmlFor={id} className="label">
        {etiqueta}
      </label>
      <input
        id={id}
        autoComplete="off"
        className={campo(nombre)}
        value={form[nombre]}
        onChange={(e) => formulario.cambiar(nombre, e.target.value)}
        {...props}
      />
      {ayuda && <p className="mt-1 text-xs text-slate-500">{ayuda}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={recargar} />}
        title="Proveedores"
        subtitle="Catálogo de proveedores y servicios externos con sus documentos de soporte"
      >
        {puedeCrear && (
          <button className="btn-primary" onClick={() => formulario.abrir()}>
            <PlusIcon className="h-5 w-5" /> Nuevo proveedor
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      <FiltrosDesplegable titulo="Buscar proveedores" ariaLabel="Filtros de proveedores" activos={filtrosActivos}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label htmlFor="prov-buscar" className="label">
              Búsqueda
            </label>
            <input
              id="prov-buscar"
              type="search"
              className="input"
              placeholder="NIT, razón social o contacto"
              value={filtros.buscar}
              onChange={(e) => cambiarFiltro('buscar', e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-ghost" disabled={!hayFiltros} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>
        {proveedores !== null && (
          <p className="text-xs text-slate-500">
            {proveedores.length} {proveedores.length === 1 ? 'proveedor' : 'proveedores'}{' '}
            {hayFiltros ? 'con los filtros aplicados' : 'en la lista'}
          </p>
        )}
      </FiltrosDesplegable>

      {(puedeCrear || puedeEditar) && (
        <ModalFormulario
          {...formulario.propsModal}
          titulo={editando ? 'Actualizar proveedor' : 'Registrar proveedor'}
          subtitulo={
            editando
              ? 'El cambio queda registrado en la bitácora de trazabilidad'
              : 'Quedará activo y disponible para órdenes y servicios'
          }
          ancho="max-w-3xl"
          textoGuardar={editando ? 'Guardar cambios' : 'Registrar proveedor'}
          acciones={
            editando &&
            puedeBaja && (
              <button type="button" className="btn-peligro ml-auto" onClick={() => baja.abrir(null, editando)}>
                <span aria-hidden="true">⚠️</span> Dar de baja
              </button>
            )
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {texto('p-doc', 'NIT / documento', 'documento_identificacion', { maxLength: 20, required: true }, 'Único. Ej.: 900123456-7')}
            {texto('p-razon', 'Razón social', 'razon_social', { maxLength: 150, required: true })}
            {texto('p-contacto', 'Nombre de contacto', 'nombre_contacto', { maxLength: 100, required: true })}
            {texto('p-tel', 'Teléfono', 'telefono', { maxLength: 20, required: true, type: 'tel' })}
            {texto('p-email', 'Correo electrónico', 'email', { maxLength: 150, required: true, type: 'email' })}
            {texto('p-dir', 'Dirección', 'direccion', { maxLength: 255 })}
          </div>
        </ModalFormulario>
      )}

      {/* Confirmación de «Dar de baja», encima del formulario de edición. */}
      <Modal
        abierto={baja.abierto}
        titulo={porDarDeBaja ? `¿Dar de baja a ${porDarDeBaja.razon_social}?` : ''}
        onCerrar={() => !baja.guardando && baja.cerrar()}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">Al dar de baja este proveedor:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Queda INACTIVO y no puede asociarse a nuevas órdenes de compra ni servicios externos.</li>
          <li>No se borra nada: se conservan su historial y documentos, y se puede reactivar desde «Incluir dados de baja».</li>
        </ul>
        {baja.error && (
          <div className="mt-3">
            <AlertaFormulario mensaje={baja.error} />
          </div>
        )}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn-primary disabled:opacity-60" disabled={baja.guardando} onClick={baja.guardar}>
            {baja.guardando ? 'Dando de baja…' : 'Dar de baja'}
          </button>
          <button type="button" className="btn-ghost" disabled={baja.guardando} onClick={baja.cerrar}>
            Cancelar
          </button>
        </div>
      </Modal>

      {conDocumentos && (
        <DocumentosProveedor
          proveedor={conDocumentos}
          puedeAdjuntar={puedeDocumentos}
          onCerrar={() => setConDocumentos(null)}
          onCambio={recargar}
        />
      )}

      {proveedores === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando proveedores…
        </div>
      )}

      {proveedores !== null && proveedores.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <TruckIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            {hayFiltros ? 'Ningún proveedor coincide con la búsqueda' : 'Aún no hay proveedores registrados'}
          </p>
          {hayFiltros && <p className="text-xs text-slate-500">Ajuste o limpie los filtros para ver más.</p>}
        </div>
      )}

      {proveedores !== null && proveedores.length > 0 && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={proveedores}
            minWidth="md:min-w-[860px]"
            filaClase={() => 'transition hover:bg-slate-50/70'}
            ficha={{
              titulo: (p) => p.razon_social,
              subtitulo: (p) => p.documento_identificacion,
            }}
            columnas={[
              {
                titulo: 'NIT',
                tdClase: 'font-medium tabular-nums text-slate-800',
                celda: (p) => p.documento_identificacion,
              },
              {
                titulo: 'Proveedor',
                movil: true,
                tdClase: 'text-slate-700',
                celda: (p) => (
                  <>
                    {p.razon_social}
                    <span className="block text-xs tabular-nums text-slate-400 md:hidden">{p.documento_identificacion}</span>
                    {!p.activo && (
                      <span className="badge ml-2 bg-slate-100 text-slate-500 ring-1 ring-slate-200">Dado de baja</span>
                    )}
                  </>
                ),
              },
              {
                titulo: 'Contacto',
                movil: true,
                tdClase: 'text-slate-600',
                celda: (p) => (
                  <>
                    {p.nombre_contacto}
                    <p className="text-xs text-slate-400">{[p.telefono, p.email].filter(Boolean).join(' · ')}</p>
                  </>
                ),
              },
              {
                titulo: 'Estado',
                movil: true,
                celda: (p) => (
                  <>
                    <span
                      className={`-my-0.5 inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                        p.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    {!p.activo && p.fecha_baja && (
                      <p className="mt-1 text-xs text-slate-400">Desde {fmtFecha(p.fecha_baja)}</p>
                    )}
                  </>
                ),
              },
              {
                titulo: 'Acciones',
                acciones: true,
                celda: (p, enFicha) => {
                  const botones = (
                    <>
                      <button
                        className="btn-accion btn-accion-editar"
                        onClick={() => setConDocumentos(p)}
                        aria-label={`Documentos de ${p.razon_social}`}
                      >
                        <PaperClipIcon className="h-4 w-4" /> Documentos ({p.documentos})
                      </button>
                      {p.activo && puedeEditar && (
                        <button
                          className="btn-accion btn-accion-editar"
                          onClick={() => abrirEditar(p)}
                          aria-label={`Actualizar ${p.razon_social}`}
                        >
                          <PencilSquareIcon className="h-4 w-4" /> Editar
                        </button>
                      )}
                      {!p.activo && puedeBaja && (
                        <button
                          className="btn-accion btn-accion-ok"
                          onClick={() => reactivar(p)}
                          aria-label={`Reactivar ${p.razon_social}`}
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" /> Reactivar
                        </button>
                      )}
                    </>
                  )
                  return enFicha ? botones : <div className="-my-1 flex flex-col items-stretch gap-1.5">{botones}</div>
                },
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}
