import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SelectorUbicacion from '../components/SelectorUbicacion.jsx'
import TelefonoPais, { telefonoLegible } from '../components/TelefonoPais.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { trabajadoresApi } from '../services/trabajadores'
import { catalogosApi } from '../services/catalogos'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'
import { fmtFecha, soloDigitos } from '../lib/format.js'
import { CATEGORIAS, agruparPorCategoria } from '../lib/catalogos.js'

/**
 * HU-04 (RF06 · RF07): registrar el personal con su cargo y especialidad.
 *
 * El cargo y la especialidad salen de los catálogos `cargos` y `especialidades`
 * (GET /api/catalogos). Si el valor no existe, se registra ahí mismo.
 *
 * Dos reglas de negocio viven en el backend y aquí solo se reflejan:
 *   - al crear, el trabajador queda ACTIVO y disponible;
 *   - la disponibilidad se deriva del estado y de las actividades asignadas.
 *     Por eso no hay casilla «Disponible para asignación»: el estado es lo que
 *     el usuario cambia y el sistema calcula el resto.
 *
 * Retirar a una persona no es un estado: es «Dar de baja» (HU-18), desde el
 * formulario de edición y con confirmación. El trabajador queda Inactivo, sale
 * de la lista y su cuenta se bloquea; se reactiva desde «Incluir dados de baja».
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
}

// Estados que se eligen a mano. INACTIVO solo lo deja «Dar de baja».
const ESTADOS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'VACACIONES', label: 'Vacaciones' },
  { value: 'LICENCIA', label: 'Licencia' },
]

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

const SIN_FILTROS = { buscar: '', estado: '', cargo_id: '', especialidad_id: '', disponible: '' }

const CATALOGO_VACIO = { nombre: '', descripcion: '', categoria: '', operativo: false }

/** Opciones de un catálogo agrupadas por categoría (<optgroup>). */
function OpcionesAgrupadas({ filas, tipo }) {
  return agruparPorCategoria(filas, tipo).map(({ categoria, items }) => (
    <optgroup key={categoria} label={categoria}>
      {items.map((f) => (
        <option key={f.id} value={f.id}>
          {f.nombre}
        </option>
      ))}
    </optgroup>
  ))
}

export default function Personal() {
  const { puede } = useAuth()
  // La interfaz sigue la matriz de permisos, no el nombre del rol.
  const puedeCrear = puede('trabajadores.crear')
  const puedeEditar = puede('trabajadores.editar')
  const puedeBaja = puede('trabajadores.dar_baja')
  const puedeCatalogos = puede('catalogos.gestionar')

  const [mapaAbierto, setMapaAbierto] = useState(false)
  // HU-18: por defecto no se muestran los registros dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const {
    filtros,
    cambiar: cambiarFiltro,
    limpiar: limpiarFiltros,
    activos: filtrosActivos,
    hayFiltros,
  } = useFiltros(SIN_FILTROS)

  // Catálogos del cargo y la especialidad.
  const [cargos, setCargos] = useState([])
  const [especialidades, setEspecialidades] = useState([])

  const {
    datos: personal,
    error,
    setError,
    aviso,
    setAviso,
    recargar,
    ejecutar,
  } = useRecurso(
    () =>
      trabajadoresApi.listar({
        incluirInactivos,
        buscar: filtros.buscar,
        estado: filtros.estado,
        cargo_id: filtros.cargo_id,
        especialidad_id: filtros.especialidad_id,
        disponible: filtros.disponible,
      }),
    [incluirInactivos, filtros],
    { mensaje: 'No se pudo cargar el personal.' },
  )

  useEffect(() => {
    catalogosApi.cargos.listar().then(setCargos).catch(() => {})
    catalogosApi.especialidades.listar().then(setEspecialidades).catch(() => {})
  }, [])

  /** Cambiar el estado reemplaza al «dar de baja»: la disponibilidad se deriva. */
  const cambiarEstado = (t, estado) => {
    if (estado === t.estado) return
    // Si falla se recarga igual, para que el selector vuelva al estado real.
    ejecutar(() => trabajadoresApi.cambiarEstado(t.id, estado), {
      exito: ({ trabajador: actualizado }) =>
        `${t.nombres} ${t.apellidos}: estado ${actualizado.estado}` +
        (Number(actualizado.disponible)
          ? Number(actualizado.actividades_vigentes) > 0
            ? ' · asignado'
            : ' · disponible'
          : ' · no disponible'),
      error: 'No se pudo cambiar el estado del trabajador.',
      recargarSiFalla: true,
    })
  }

  /**
   * CU-04: registrar o actualizar el personal con su cargo y especialidad.
   * `registro` es el trabajador en edición (null = se registra uno nuevo).
   */
  const formulario = useFormulario(VACIO, {
    enviar: (f, trabajador) => {
      const cuerpo = {
        ...f,
        numero_documento: soloDigitos(f.numero_documento),
        cargo_id: Number(f.cargo_id),
        especialidad_id: f.especialidad_id ? Number(f.especialidad_id) : null,
      }
      return trabajador ? trabajadoresApi.actualizar(trabajador.id, cuerpo) : trabajadoresApi.crear(cuerpo)
    },
    alGuardar: ({ trabajador: t }, { registro }) => {
      setAviso(
        registro
          ? `${t.nombres} ${t.apellidos}: información actualizada (${t.cargo}).`
          : `${t.nombres} ${t.apellidos} registrado como ${t.cargo}.`,
      )
      return recargar()
    },
    error: 'No se pudo guardar el trabajador.',
  })
  const form = formulario.valores
  const editando = formulario.registro

  /**
   * Registra un cargo o una especialidad nueva sin salir del formulario: queda
   * en el catálogo (se puede editar después en Gestión Administrativa) y de
   * una vez seleccionada en el trabajador que se está registrando.
   * `registro` es el catálogo: 'cargos' o 'especialidades'.
   */
  const catalogo = useFormulario(CATALOGO_VACIO, {
    enviar: (f, tipo) =>
      catalogosApi[tipo].crear({
        nombre: f.nombre,
        descripcion: f.descripcion,
        categoria: f.categoria || null,
        ...(tipo === 'cargos' ? { operativo: f.operativo } : {}),
      }),
    alGuardar: (data, { registro: tipo }) => {
      const fila = data[tipo === 'cargos' ? 'cargo' : 'especialidad']
      const agregar = (prev) => [...prev, fila].sort((a, b) => a.nombre.localeCompare(b.nombre))
      if (tipo === 'cargos') {
        setCargos(agregar)
        formulario.cambiar('cargo_id', String(fila.id))
      } else {
        setEspecialidades(agregar)
        formulario.cambiar('especialidad_id', String(fila.id))
      }
      setAviso(`${fila.nombre} agregado al catálogo y seleccionado.`)
    },
    error: 'No se pudo registrar en el catálogo.',
  })
  const nuevoCatalogo = catalogo.registro

  /**
   * HU-18: confirmación de «Dar de baja» (`registro` es el trabajador que se
   * retira). El backend la rechaza si tiene trabajo en curso a su cargo.
   */
  const baja = useFormulario(null, {
    enviar: (_, t) => trabajadoresApi.baja(t.id),
    alGuardar: (data, { registro: t }) => {
      formulario.cerrar()
      setError('')
      setAviso(
        `Se dio de baja a ${t.nombres} ${t.apellidos}.` +
          (data.cuenta_bloqueada ? ` Su cuenta «${data.cuenta_bloqueada}» quedó bloqueada.` : ''),
      )
      return recargar()
    },
    error: 'No se pudo dar de baja al trabajador.',
  })
  const porDarDeBaja = baja.registro

  /** Pasa el trabajador a edición: el formulario se abre con sus datos actuales. */
  const abrirEditar = (t) => {
    setAviso('')
    formulario.abrir({
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
    }, t)
  }

  /** «⚠️ Dar de baja» del formulario de edición: abre la confirmación encima. */
  const pedirBaja = () => baja.abrir(null, editando)

  /** HU-18: vuelve a la operación como Activo (y reabre la cuenta que cerró la baja). */
  const reactivar = (t) =>
    ejecutar(() => trabajadoresApi.reactivar(t.id), {
      exito: (data) =>
        `Se reactivó a ${t.nombres} ${t.apellidos}.` +
        (data.cuenta_reactivada ? ' Su cuenta de acceso también se reactivó.' : ''),
      error: 'No se pudo reactivar al trabajador.',
    })

  const campo = formulario.claseCampo
  const cargoElegido = cargos.find((c) => String(c.id) === String(form.cargo_id))
  // Al editar a alguien cuyo cargo se dio de baja en el catálogo (p. ej. Oficial),
  // ese cargo ya no está en la lista: se avisa para que elija uno vigente.
  const cargoRetirado = editando && form.cargo_id && !cargoElegido ? editando.cargo : null

  return (
    <div className="space-y-6">
      <PageHeader accion={<BotonActualizar onClick={recargar} />}
        title="Personal"
        subtitle="Registrar personal con su cargo y especialidad"
      >
        {puedeCrear && (
          <button
            className="btn-primary"
            onClick={() => formulario.abrir()}
          >
            <PlusIcon className="h-5 w-5" /> Nuevo trabajador
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {/* Búsqueda y filtros (corren en la base por el volumen de personal) */}
      <FiltrosDesplegable
        titulo="Buscar personal"
        ariaLabel="Filtros de personal"
        activos={filtrosActivos}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label htmlFor="per-buscar" className="label">
              Búsqueda
            </label>
            <input
              id="per-buscar"
              type="search"
              className="input"
              placeholder="Nombre, documento, correo, cargo o especialidad"
              value={filtros.buscar}
              onChange={(e) => cambiarFiltro('buscar', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="per-estado" className="label">
              Estado
            </label>
            <select
              id="per-estado"
              className="input"
              value={filtros.estado}
              onChange={(e) => cambiarFiltro('estado', e.target.value)}
            >
              <option value="">Todos</option>
              {ESTADOS.map((e2) => (
                <option key={e2.value} value={e2.value}>
                  {e2.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="per-disponible" className="label">
              Disponibilidad
            </label>
            <select
              id="per-disponible"
              className="input"
              value={filtros.disponible}
              onChange={(e) => cambiarFiltro('disponible', e.target.value)}
            >
              <option value="">Todas</option>
              <option value="libre">Disponibles</option>
              <option value="asignado">Asignados</option>
              <option value="0">No disponibles</option>
            </select>
          </div>
          <div>
            <label htmlFor="per-cargo" className="label">
              Cargo
            </label>
            <select
              id="per-cargo"
              className="input"
              value={filtros.cargo_id}
              onChange={(e) => cambiarFiltro('cargo_id', e.target.value)}
            >
              <option value="">Todos</option>
              <OpcionesAgrupadas filas={cargos} tipo="cargos" />
            </select>
          </div>
          {/* CU-04 · Alt 2: el personal se filtra por especialidad para tareas específicas. */}
          <div>
            <label htmlFor="per-especialidad" className="label">
              Especialidad
            </label>
            <select
              id="per-especialidad"
              className="input"
              value={filtros.especialidad_id}
              onChange={(e) => cambiarFiltro('especialidad_id', e.target.value)}
            >
              <option value="">Todas</option>
              <OpcionesAgrupadas filas={especialidades} tipo="especialidades" />
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-ghost"
              disabled={!hayFiltros}
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
        {personal !== null && (
          <p className="text-xs text-slate-500">
            {personal.length} {personal.length === 1 ? 'trabajador' : 'trabajadores'}{' '}
            {hayFiltros ? 'con los filtros aplicados' : 'en la lista'}
          </p>
        )}
      </FiltrosDesplegable>

      {/* Formulario de registro: en ventana emergente, no al final de la página. */}
      {(puedeCrear || puedeEditar) && (
        <ModalFormulario
          {...formulario.propsModal}
          titulo={editando ? 'Actualizar información del trabajador' : 'Registrar personal'}
          subtitulo={
            editando
              ? 'El cambio queda registrado en la bitácora de trazabilidad'
              : 'Cargo y especialidad salen del catálogo de la empresa'
          }
          ancho="max-w-3xl"
          textoGuardar={editando ? 'Guardar cambios' : 'Registrar trabajador'}
          acciones={
            editando && (
              <button type="button" className="btn-peligro ml-auto" onClick={pedirBaja}>
                <span aria-hidden="true">⚠️</span> Dar de baja
              </button>
            )
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="t-doc" className="label">
                Número de documento
              </label>
              <input
                id="t-doc"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={20}
                className={`${campo('numero_documento')} tabular-nums`}
                value={form.numero_documento}
                onChange={(e) =>
                  formulario.cambiar('numero_documento', soloDigitos(e.target.value).slice(0, 20))
                }
                disabled={Boolean(editando)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                {editando
                  ? 'El documento identifica al trabajador y no se edita.'
                  : 'Solo números, sin puntos ni espacios.'}
              </p>
            </div>
            <div>
              <label htmlFor="t-tipo" className="label">
                Tipo de documento
              </label>
              <select
                id="t-tipo"
                className="input"
                value={form.tipo_documento}
                onChange={(e) => formulario.cambiar('tipo_documento', e.target.value)}
              >
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="NIT">NIT</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <div>
              <label htmlFor="t-nombres" className="label">
                Nombres
              </label>
              <input
                id="t-nombres"
                maxLength={100}
                className="input"
                value={form.nombres}
                onChange={(e) => formulario.cambiar('nombres', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="t-apellidos" className="label">
                Apellidos
              </label>
              <input
                id="t-apellidos"
                maxLength={100}
                className="input"
                value={form.apellidos}
                onChange={(e) => formulario.cambiar('apellidos', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="t-email" className="label">
                Correo personal
              </label>
              <input
                id="t-email"
                maxLength={150}
                type="email"
                autoComplete="email"
                placeholder="nombre@correo.com"
                className={campo('email')}
                value={form.email}
                onChange={(e) => formulario.cambiar('email', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="t-telefono" className="label">
                Teléfono
              </label>
              <TelefonoPais
                id="t-telefono"
                value={form.telefono}
                onChange={(v) => formulario.cambiar('telefono', v)}
                error={formulario.campo === 'telefono'}
              />
            </div>

            <div>
              <label htmlFor="t-cargo" className="label">
                Cargo
              </label>
              <select
                id="t-cargo"
                className={campo('cargo_id')}
                value={form.cargo_id}
                onChange={(e) => {
                  if (e.target.value === '__nuevo__') {
                    catalogo.abrir(CATALOGO_VACIO, 'cargos')
                    return
                  }
                  formulario.cambiar('cargo_id', e.target.value)
                }}
                required
              >
                <option value="">Seleccione un cargo…</option>
                <OpcionesAgrupadas filas={cargos} tipo="cargos" />
                {puedeCatalogos && <option value="__nuevo__">+ Registrar un cargo nuevo…</option>}
              </select>
              <p className={`mt-1 text-xs ${cargoRetirado ? 'text-amber-700' : 'text-slate-500'}`}>
                {cargoRetirado
                  ? `El cargo «${cargoRetirado}» ya no está en el catálogo: elija uno vigente.`
                  : cargoElegido
                    ? cargoElegido.operativo
                      ? 'Cargo de obra: la especialidad es obligatoria.'
                      : 'La especialidad es opcional para este cargo.'
                    : `${cargos.length} cargos en el catálogo de la empresa.`}
              </p>
            </div>
            <div>
              <label htmlFor="t-especialidad" className="label">
                Especialidad
              </label>
              <select
                id="t-especialidad"
                className={campo('especialidad_id')}
                value={form.especialidad_id}
                onChange={(e) => {
                  if (e.target.value === '__nuevo__') {
                    catalogo.abrir(CATALOGO_VACIO, 'especialidades')
                    return
                  }
                  formulario.cambiar('especialidad_id', e.target.value)
                }}
              >
                <option value="">Sin especialidad</option>
                <OpcionesAgrupadas filas={especialidades} tipo="especialidades" />
                {puedeCatalogos && <option value="__nuevo__">+ Registrar una especialidad nueva…</option>}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Obligatoria para los cargos de obra (maestro de obra, obrero, operario…): sin ella
                no se puede filtrar al trabajador para tareas específicas.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="t-direccion" className="label">
                Dirección
              </label>
              <div className="flex gap-2">
                <input
                  id="t-direccion"
                  maxLength={255}
                  className="input"
                  placeholder="Escriba la dirección o selecciónela en el mapa"
                  value={form.direccion}
                  onChange={(e) => formulario.cambiar('direccion', e.target.value)}
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

            {/* El estado define la disponibilidad; al crear siempre queda Activo. */}
            <div>
              <label htmlFor="t-estado" className="label">
                Estado
              </label>
              <select
                id="t-estado"
                className="input"
                value={form.estado}
                disabled={!editando}
                onChange={(e) => formulario.cambiar('estado', e.target.value)}
              >
                {ESTADOS.map((e2) => (
                  <option key={e2.value} value={e2.value}>
                    {e2.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {editando
                  ? 'Al pasar a un estado distinto de Activo, el trabajador deja de estar disponible.'
                  : 'Al registrarlo queda Activo y disponible.'}
              </p>
            </div>
          </div>
        </ModalFormulario>
      )}

      {/* Confirmación de «Dar de baja»: se abre encima del formulario de edición,
          con el mismo estilo que las demás confirmaciones (Roles, Gestión Administrativa). */}
      <Modal
        abierto={baja.abierto}
        titulo={porDarDeBaja ? `¿Dar de baja a ${porDarDeBaja.nombres} ${porDarDeBaja.apellidos}?` : ''}
        onCerrar={() => !baja.guardando && baja.cerrar()}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">Al dar de baja a esta persona:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Deja de aparecer en la lista de personal y en la selección de responsables.</li>
          <li>No podrá asignarse a proyectos ni actividades nuevas.</li>
          <li>Si tiene cuenta para entrar al sistema, la cuenta se bloquea y su sesión se cierra.</li>
          <li>No se borra nada: su historial se conserva y se puede reactivar desde «Incluir dados de baja».</li>
        </ul>
        <p className="mt-3 rounded-xl bg-accent-50 px-4 py-3 text-xs text-brand-800 ring-1 ring-accent-200">
          Si es responsable de proyectos o actividades en curso, primero hay que reasignarlos.
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
          <button
            type="button"
            className="btn-ghost"
            disabled={baja.guardando}
            onClick={baja.cerrar}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Alta rápida de un valor del catálogo sin salir del formulario. */}
      <ModalFormulario
        {...catalogo.propsModal}
        titulo={CATALOGO_TITULO[nuevoCatalogo] ?? ''}
        subtitulo="Queda guardado en el catálogo de la empresa y seleccionado en el formulario"
        textoGuardar="Agregar al catálogo"
        espaciado="space-y-4"
      >
        <div>
          <label htmlFor="cat-nombre" className="label">
            Nombre
          </label>
          <input
            id="cat-nombre"
            maxLength={100}
            className="input"
            value={catalogo.valores.nombre}
            required
            minLength={3}
            onChange={(e) => catalogo.cambiar('nombre', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cat-descripcion" className="label">
            Descripción
          </label>
          <input
            id="cat-descripcion"
            maxLength={255}
            className="input"
            value={catalogo.valores.descripcion}
            onChange={(e) => catalogo.cambiar('descripcion', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cat-categoria" className="label">
            Categoría
          </label>
          <select
            id="cat-categoria"
            className="input"
            value={catalogo.valores.categoria}
            onChange={(e) => catalogo.cambiar('categoria', e.target.value)}
          >
            <option value="">Sin categoría (aparece en «Otros»)</option>
            {(CATEGORIAS[nuevoCatalogo] ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {nuevoCatalogo === 'cargos' && (
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              checked={catalogo.valores.operativo}
              onChange={(e) => catalogo.cambiar('operativo', e.target.checked)}
            />
            <span>
              Es cargo de obra
              <span className="block text-xs text-slate-500">
                Para estos cargos la especialidad es obligatoria.
              </span>
            </span>
          </label>
        )}
      </ModalFormulario>

      {/* Mapa para la dirección: devuelve el texto normalizado al formulario. */}
      <SelectorUbicacion
        abierto={mapaAbierto}
        valorInicial={form.direccion}
        onCerrar={() => setMapaAbierto(false)}
        onAceptar={(texto) => {
          formulario.cambiar('direccion', texto)
          setMapaAbierto(false)
        }}
      />

      {personal === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando personal…
        </div>
      )}

      {personal !== null && personal.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <UsersIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            {hayFiltros ? 'Ningún trabajador coincide con la búsqueda' : 'Aún no hay personal registrado'}
          </p>
          {hayFiltros && (
            <p className="text-xs text-slate-500">Ajuste o limpie los filtros para ver más.</p>
          )}
        </div>
      )}

      {personal !== null && personal.length > 0 && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={personal}
            minWidth="md:min-w-[860px]"
            filaClase={() => 'transition hover:bg-slate-50/70'}
            // Hay celdas de varias líneas (cargo con especialidad, contacto): se
            // alinea todo al primer renglón para que la fila se lea de corrido.
            alinearArriba
            ficha={{
              titulo: (t) => `${t.nombres} ${t.apellidos}`,
              subtitulo: (t) => (t.especialidad ? `${t.cargo} · ${t.especialidad}` : t.cargo),
            }}
            columnas={[
              {
                titulo: 'Trabajador',
                movil: true,
                tdClase: 'font-medium text-slate-800',
                celda: (t) => (
                  <>
                    {t.nombres} {t.apellidos}
                    {!t.activo && (
                      <span className="badge ml-2 bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                        Dado de baja
                      </span>
                    )}
                  </>
                ),
              },
              {
                titulo: 'Documento',
                tdClase: 'text-slate-600',
                celda: (t) => `${t.tipo_documento} ${t.numero_documento}`,
              },
              {
                titulo: 'Cargo',
                movil: true,
                tdClase: 'text-slate-600',
                // La especialidad va bajo el cargo: dice en qué oficio se desempeña.
                celda: (t) => (
                  <>
                    {t.cargo}
                    {t.especialidad && <p className="text-xs text-slate-400">{t.especialidad}</p>}
                  </>
                ),
              },
              {
                titulo: 'Contacto',
                // leading-5: el texto pequeño ocupa el mismo renglón que el resto de la fila.
                tdClase: 'text-xs leading-5 text-slate-500',
                celda: (t) => (
                  <>
                    {t.email ?? '—'}
                    {t.telefono && <p className="tabular-nums">{telefonoLegible(t.telefono)}</p>}
                    {t.direccion && (
                      <p className="max-w-[180px] truncate" title={t.direccion}>
                        {t.direccion}
                      </p>
                    )}
                  </>
                ),
                valor: (t) => (
                  <>
                    {t.email ?? '—'}
                    {t.telefono && <p className="tabular-nums">{telefonoLegible(t.telefono)}</p>}
                    {t.direccion && <p>{t.direccion}</p>}
                  </>
                ),
              },
              {
                titulo: 'Estado',
                // Más aire frente a Contacto y sin cortes: el selector tiene ancho fijo.
                thClase: 'pl-6 whitespace-nowrap',
                tdClase: 'pl-6 whitespace-nowrap',
                celda: (t) =>
                  !t.activo ? (
                    <div>
                      <span className={`-my-0.5 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_BADGE.INACTIVO}`}>
                        Inactivo
                      </span>
                      {t.fecha_baja && (
                        <p className="mt-1 text-xs text-slate-400">De baja desde {fmtFecha(t.fecha_baja)}</p>
                      )}
                    </div>
                  ) : puedeEditar ? (
                    <select
                      // Ancho fijo (cabe «Vacaciones») y poco relleno izquierdo para que el
                      // texto quede bajo «ESTADO»; -my-1 lo centra en el primer renglón.
                      className="input -my-1 block w-32 py-1 pl-2.5 text-xs"
                      aria-label={`Estado de ${t.nombres} ${t.apellidos}`}
                      value={t.estado}
                      onChange={(e) => cambiarEstado(t, e.target.value)}
                    >
                      {ESTADOS.map((e2) => (
                        <option key={e2.value} value={e2.value}>
                          {e2.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`-my-0.5 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ESTADO_BADGE[t.estado] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.estado}
                    </span>
                  ),
              },
              {
                titulo: 'Disponibilidad',
                celda: (t) => {
                  // No disponible: no ACTIVO. Asignado: ACTIVO con actividades vigentes (aún asignable).
                  const [texto, clase] = !Number(t.disponible)
                    ? ['No disponible', 'bg-red-50 text-red-700']
                    : Number(t.actividades_vigentes) > 0
                      ? ['Asignado', 'bg-amber-50 text-amber-700']
                      : ['Disponible', 'bg-emerald-50 text-emerald-700']
                  return (
                    <span className={`-my-0.5 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${clase}`}>
                      {texto}
                    </span>
                  )
                },
              },
              {
                titulo: 'Acciones',
                acciones: true,
                // Un registro dado de baja es historial: no se edita, solo se reactiva.
                celda: (t, enFicha) => {
                  if (t.activo ? !puedeEditar : !puedeBaja) return null
                  const botones = t.activo ? (
                    <button
                      className="btn-accion btn-accion-editar"
                      onClick={() => abrirEditar(t)}
                      aria-label={`Actualizar información de ${t.nombres}`}
                    >
                      <PencilSquareIcon className="h-4 w-4" /> Editar
                    </button>
                  ) : (
                    <button
                      className="btn-accion btn-accion-ok"
                      onClick={() => reactivar(t)}
                      aria-label={`Reactivar a ${t.nombres} ${t.apellidos}`}
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
