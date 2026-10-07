import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  PencilSquareIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { herramientasApi } from '../services/herramientas'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'
import { fmtFecha } from '../lib/format.js'

/**
 * HU-10 (CU-10): catálogo de herramientas con su estado operativo y su
 * disponibilidad, para saber si pueden prestarse.
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - el código serial es obligatorio y único;
 *   - toda herramienta pertenece a un almacén;
 *   - la disponibilidad no se edita a mano: la mueven los préstamos y la baja;
 *   - «prestable» = activa, DISPONIBLE y en estado Excelente, Bueno o Regular;
 *   - dar de baja (HU-18) la deja en BAJA y fuera de los préstamos.
 */

const VACIO = {
  codigo_serial: '',
  nombre: '',
  marca: '',
  modelo: '',
  almacen_id: '',
  estado_operativo: 'EXCELENTE',
  observaciones: '',
}

const ESTADOS = [
  { value: 'EXCELENTE', label: 'Excelente', badge: 'bg-emerald-50 text-emerald-700' },
  { value: 'BUENO', label: 'Bueno', badge: 'bg-emerald-50 text-emerald-700' },
  { value: 'REGULAR', label: 'Regular', badge: 'bg-amber-50 text-amber-700' },
  { value: 'DANIADA', label: 'Dañada', badge: 'bg-red-50 text-red-700' },
  { value: 'EN_MANTENIMIENTO', label: 'En mantenimiento', badge: 'bg-sky-50 text-sky-700' },
]

const DISPONIBILIDADES = [
  { value: 'DISPONIBLE', label: 'Disponible', badge: 'bg-emerald-50 text-emerald-700' },
  { value: 'PRESTADA', label: 'Prestada', badge: 'bg-amber-50 text-amber-700' },
  { value: 'EN_TRASLADO', label: 'En traslado', badge: 'bg-sky-50 text-sky-700' },
  { value: 'BAJA', label: 'De baja', badge: 'bg-slate-100 text-slate-600' },
]

const SIN_FILTROS = { buscar: '', almacen_id: '', estado_operativo: '', disponibilidad: '', prestable: '' }

const buscarEn = (lista, valor) => lista.find((x) => x.value === valor)

function Badge({ opcion, texto }) {
  return (
    <span
      className={`-my-0.5 inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        opcion?.badge ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {texto ?? opcion?.label}
    </span>
  )
}

export default function Herramientas() {
  const { puede } = useAuth()
  const puedeCrear = puede('herramientas.crear')
  const puedeEditar = puede('herramientas.editar')
  const puedeBaja = puede('herramientas.dar_baja')

  // HU-18: por defecto no se muestran las herramientas dadas de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [almacenes, setAlmacenes] = useState([])
  const {
    filtros,
    cambiar: cambiarFiltro,
    limpiar: limpiarFiltros,
    activos: filtrosActivos,
    hayFiltros,
  } = useFiltros(SIN_FILTROS)

  const {
    datos: herramientas,
    error,
    setError,
    aviso,
    setAviso,
    recargar,
    ejecutar,
  } = useRecurso(
    () =>
      herramientasApi.listar({
        incluirInactivos,
        buscar: filtros.buscar,
        almacen_id: filtros.almacen_id,
        estado_operativo: filtros.estado_operativo,
        disponibilidad: filtros.disponibilidad,
        prestable: filtros.prestable === '1',
      }),
    [incluirInactivos, filtros],
    { mensaje: 'No se pudo cargar el catálogo de herramientas.' },
  )

  useEffect(() => {
    herramientasApi.almacenes().then(setAlmacenes).catch(() => {})
  }, [])

  /** CU-10: registrar o actualizar. `registro` es la herramienta en edición (null = nueva). */
  const formulario = useFormulario(VACIO, {
    enviar: (f, herramienta) => {
      const cuerpo = { ...f, almacen_id: f.almacen_id ? Number(f.almacen_id) : '' }
      return herramienta
        ? herramientasApi.actualizar(herramienta.id, cuerpo)
        : herramientasApi.crear(cuerpo)
    },
    alGuardar: ({ herramienta: h }, { registro }) => {
      setAviso(
        registro
          ? `${h.nombre} (${h.codigo_serial}): información actualizada.`
          : `${h.nombre} (${h.codigo_serial}) registrada en ${h.almacen}.`,
      )
      return recargar()
    },
    error: 'No se pudo guardar la herramienta.',
  })
  const form = formulario.valores
  const editando = formulario.registro
  const campo = formulario.claseCampo

  /** HU-18: confirmación de «Dar de baja» (`registro` es la herramienta). */
  const baja = useFormulario(null, {
    enviar: (_, h) => herramientasApi.baja(h.id),
    alGuardar: (_, { registro: h }) => {
      formulario.cerrar()
      setError('')
      setAviso(`${h.nombre} (${h.codigo_serial}) se dio de baja y ya no está disponible para préstamo.`)
      return recargar()
    },
    error: 'No se pudo dar de baja la herramienta.',
  })
  const porDarDeBaja = baja.registro

  const abrirEditar = (h) => {
    setAviso('')
    formulario.abrir(
      {
        codigo_serial: h.codigo_serial ?? '',
        nombre: h.nombre ?? '',
        marca: h.marca ?? '',
        modelo: h.modelo ?? '',
        almacen_id: String(h.almacen_id ?? ''),
        estado_operativo: h.estado_operativo ?? 'EXCELENTE',
        observaciones: h.observaciones ?? '',
      },
      h,
    )
  }

  const reactivar = (h) =>
    ejecutar(() => herramientasApi.reactivar(h.id), {
      exito: () => `Se reactivó ${h.nombre} (${h.codigo_serial}).`,
      error: 'No se pudo reactivar la herramienta.',
    })

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={recargar} />}
        title="Herramientas"
        subtitle="Catálogo de herramientas con su estado operativo y disponibilidad"
      >
        {puedeCrear && (
          <button className="btn-primary" onClick={() => formulario.abrir()}>
            <PlusIcon className="h-5 w-5" /> Nueva herramienta
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dadas de baja' : 'Incluir dadas de baja'}
        </button>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      <FiltrosDesplegable
        titulo="Buscar herramientas"
        ariaLabel="Filtros de herramientas"
        activos={filtrosActivos}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label htmlFor="her-buscar" className="label">
              Búsqueda
            </label>
            <input
              id="her-buscar"
              type="search"
              className="input"
              placeholder="Serial, nombre, marca o modelo"
              value={filtros.buscar}
              onChange={(e) => cambiarFiltro('buscar', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="her-almacen" className="label">
              Almacén
            </label>
            <select
              id="her-almacen"
              className="input"
              value={filtros.almacen_id}
              onChange={(e) => cambiarFiltro('almacen_id', e.target.value)}
            >
              <option value="">Todos</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="her-estado" className="label">
              Estado operativo
            </label>
            <select
              id="her-estado"
              className="input"
              value={filtros.estado_operativo}
              onChange={(e) => cambiarFiltro('estado_operativo', e.target.value)}
            >
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="her-disp" className="label">
              Disponibilidad
            </label>
            <select
              id="her-disp"
              className="input"
              value={filtros.disponibilidad}
              onChange={(e) => cambiarFiltro('disponibilidad', e.target.value)}
            >
              <option value="">Todas</option>
              {DISPONIBILIDADES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="her-prestable" className="label">
              Préstamo
            </label>
            <select
              id="her-prestable"
              className="input"
              value={filtros.prestable}
              onChange={(e) => cambiarFiltro('prestable', e.target.value)}
            >
              <option value="">Todas</option>
              <option value="1">Solo prestables</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-ghost" disabled={!hayFiltros} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>
        {herramientas !== null && (
          <p className="text-xs text-slate-500">
            {herramientas.length} {herramientas.length === 1 ? 'herramienta' : 'herramientas'}{' '}
            {hayFiltros ? 'con los filtros aplicados' : 'en la lista'}
          </p>
        )}
      </FiltrosDesplegable>

      {(puedeCrear || puedeEditar) && (
        <ModalFormulario
          {...formulario.propsModal}
          titulo={editando ? 'Actualizar herramienta' : 'Registrar herramienta'}
          subtitulo={
            editando
              ? 'El cambio queda registrado en la bitácora de trazabilidad'
              : 'Queda disponible en el almacén que elija'
          }
          ancho="max-w-3xl"
          textoGuardar={editando ? 'Guardar cambios' : 'Registrar herramienta'}
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
            <div>
              <label htmlFor="h-serial" className="label">
                Código serial
              </label>
              <input
                id="h-serial"
                maxLength={50}
                autoComplete="off"
                className={campo('codigo_serial')}
                value={form.codigo_serial}
                onChange={(e) => formulario.cambiar('codigo_serial', e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">Único para cada herramienta.</p>
            </div>
            <div>
              <label htmlFor="h-nombre" className="label">
                Nombre
              </label>
              <input
                id="h-nombre"
                maxLength={100}
                className={campo('nombre')}
                value={form.nombre}
                onChange={(e) => formulario.cambiar('nombre', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="h-marca" className="label">
                Marca
              </label>
              <input
                id="h-marca"
                maxLength={50}
                className={campo('marca')}
                value={form.marca}
                onChange={(e) => formulario.cambiar('marca', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="h-modelo" className="label">
                Modelo
              </label>
              <input
                id="h-modelo"
                maxLength={50}
                className={campo('modelo')}
                value={form.modelo}
                onChange={(e) => formulario.cambiar('modelo', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="h-almacen" className="label">
                Almacén
              </label>
              <select
                id="h-almacen"
                className={campo('almacen_id')}
                value={form.almacen_id}
                onChange={(e) => formulario.cambiar('almacen_id', e.target.value)}
                required
              >
                <option value="">Seleccione un almacén…</option>
                {almacenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="h-estado" className="label">
                Estado operativo
              </label>
              <select
                id="h-estado"
                className={campo('estado_operativo')}
                value={form.estado_operativo}
                onChange={(e) => formulario.cambiar('estado_operativo', e.target.value)}
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Dañada o en mantenimiento no se puede prestar.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="h-obs" className="label">
                Observaciones
              </label>
              <textarea
                id="h-obs"
                rows={2}
                className={campo('observaciones')}
                value={form.observaciones}
                onChange={(e) => formulario.cambiar('observaciones', e.target.value)}
              />
            </div>
          </div>
        </ModalFormulario>
      )}

      {/* Confirmación de «Dar de baja» (HU-18), encima del formulario de edición. */}
      <Modal
        abierto={baja.abierto}
        titulo={porDarDeBaja ? `¿Dar de baja ${porDarDeBaja.nombre} (${porDarDeBaja.codigo_serial})?` : ''}
        onCerrar={() => !baja.guardando && baja.cerrar()}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">Al dar de baja esta herramienta:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Deja de aparecer en el catálogo y no se puede prestar.</li>
          <li>No se borra nada: se conserva su historial y se puede reactivar desde «Incluir dadas de baja».</li>
        </ul>
        <p className="mt-3 rounded-xl bg-accent-50 px-4 py-3 text-xs text-brand-800 ring-1 ring-accent-200">
          Si está prestada o en traslado, primero hay que registrar su devolución.
        </p>
        {baja.error && (
          <div className="mt-3">
            <AlertaFormulario mensaje={baja.error} />
          </div>
        )}
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-primary disabled:opacity-60"
            disabled={baja.guardando}
            onClick={baja.guardar}
          >
            {baja.guardando ? 'Dando de baja…' : 'Dar de baja'}
          </button>
          <button type="button" className="btn-ghost" disabled={baja.guardando} onClick={baja.cerrar}>
            Cancelar
          </button>
        </div>
      </Modal>

      {herramientas === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando herramientas…
        </div>
      )}

      {herramientas !== null && herramientas.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <WrenchScrewdriverIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            {hayFiltros ? 'Ninguna herramienta coincide con la búsqueda' : 'Aún no hay herramientas registradas'}
          </p>
          {hayFiltros && <p className="text-xs text-slate-500">Ajuste o limpie los filtros para ver más.</p>}
        </div>
      )}

      {herramientas !== null && herramientas.length > 0 && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={herramientas}
            minWidth="md:min-w-[860px]"
            filaClase={() => 'transition hover:bg-slate-50/70'}
            ficha={{
              titulo: (h) => h.nombre,
              subtitulo: (h) => h.codigo_serial,
            }}
            columnas={[
              {
                titulo: 'Serial',
                tdClase: 'font-medium tabular-nums text-slate-800',
                celda: (h) => h.codigo_serial,
              },
              {
                titulo: 'Herramienta',
                movil: true,
                tdClase: 'text-slate-700',
                celda: (h) => (
                  <>
                    {h.nombre}
                    <span className="block text-xs tabular-nums text-slate-400 md:hidden">{h.codigo_serial}</span>
                    {!h.activo && (
                      <span className="badge ml-2 bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                        Dada de baja
                      </span>
                    )}
                    {(h.marca || h.modelo) && (
                      <p className="text-xs text-slate-400">{[h.marca, h.modelo].filter(Boolean).join(' · ')}</p>
                    )}
                  </>
                ),
              },
              { titulo: 'Almacén', tdClase: 'text-slate-600', celda: (h) => h.almacen },
              {
                titulo: 'Estado',
                movil: true,
                celda: (h) => <Badge opcion={buscarEn(ESTADOS, h.estado_operativo)} />,
              },
              {
                titulo: 'Disponibilidad',
                celda: (h) => (
                  <>
                    <Badge opcion={buscarEn(DISPONIBILIDADES, h.disponibilidad)} />
                    {!h.activo && h.fecha_baja && (
                      <p className="mt-1 text-xs text-slate-400">Desde {fmtFecha(h.fecha_baja)}</p>
                    )}
                  </>
                ),
              },
              {
                titulo: 'Préstamo',
                celda: (h) =>
                  h.prestable ? (
                    <Badge opcion={{ badge: 'bg-emerald-50 text-emerald-700' }} texto="Prestable" />
                  ) : (
                    <Badge opcion={{ badge: 'bg-slate-100 text-slate-600' }} texto="No prestable" />
                  ),
              },
              {
                titulo: 'Acciones',
                acciones: true,
                // Una herramienta dada de baja es historial: no se edita, solo se reactiva.
                celda: (h, enFicha) => {
                  if (h.activo ? !puedeEditar : !puedeBaja) return null
                  const botones = h.activo ? (
                    <button
                      className="btn-accion btn-accion-editar"
                      onClick={() => abrirEditar(h)}
                      aria-label={`Actualizar ${h.nombre}`}
                    >
                      <PencilSquareIcon className="h-4 w-4" /> Editar
                    </button>
                  ) : (
                    <button
                      className="btn-accion btn-accion-ok"
                      onClick={() => reactivar(h)}
                      aria-label={`Reactivar ${h.nombre}`}
                    >
                      <ArrowUturnLeftIcon className="h-4 w-4" /> Reactivar
                    </button>
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
