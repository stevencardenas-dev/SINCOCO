import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  EnvelopeIcon,
  IdentificationIcon,
  PhoneIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import Paginacion from '../components/Paginacion.jsx'
import SelectorOrden from '../components/SelectorOrden.jsx'
import { usePaginacion } from '../hooks/usePaginacion'
import { bajaInicial, filtrosIniciales, paginaInicial, useEscribirUrl, valorUrl } from '../hooks/useListadoUrl'
import Avatar from '../components/Avatar.jsx'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { BotonDarDeBaja } from '../components/BotonesBaja.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import { Interruptor, SeccionFiltros, Segmentado } from '../components/FiltrosControles.jsx'
import ConfirmarAusencia from '../components/ConfirmarAusencia.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import AsignarPersonal from '../components/AsignarPersonal.jsx'
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
import { mensajeError } from '../lib/errores.js'
import { CATEGORIAS, agruparPorCategoria } from '../lib/catalogos.js'
import SelectBuscable from '../components/SelectBuscable.jsx'

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

const SIN_FILTROS = { buscar: '', estado: '', cargo_id: '', especialidad_id: '', disponible: '', desde: '', hasta: '' }

// Orden de la lista. '' = el del servidor.
const ORDENES = [
  { value: '', label: 'Más recientes' },
  { value: 'nombre', label: 'Nombre (A–Z)' },
  { value: 'cargo', label: 'Cargo' },
  { value: 'disponibilidad', label: 'Disponibles primero' },
]
const RANGO_DISP = { Disponible: 0, Asignado: 1, 'No disponible': 2 }
const ordenar = (lista, orden) => {
  const f = {
    nombre: (a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es'),
    cargo: (a, b) => String(a.cargo ?? '').localeCompare(String(b.cargo ?? ''), 'es'),
    disponibilidad: (a, b) => RANGO_DISP[disponibilidad(a)[0]] - RANGO_DISP[disponibilidad(b)[0]],
  }[orden]
  return f ? [...lista].sort(f) : lista
}

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

// No disponible: no ACTIVO. Asignado: ACTIVO con actividades vigentes (aún asignable).
function disponibilidad(t) {
  return !Number(t.disponible)
    ? ['No disponible', 'bg-red-50 text-red-700']
    : Number(t.actividades_vigentes) > 0
      ? ['Asignado', 'bg-amber-50 text-amber-700']
      : ['Disponible', 'bg-emerald-50 text-emerald-700']
}

function TarjetaTrabajador({ t, onAbrir }) {
  const nombre = `${t.nombres} ${t.apellidos}`
  const [dispTexto, dispClase] = disponibilidad(t)
  return (
    <button
      type="button"
      onClick={() => onAbrir(t)}
      aria-label={`Ver ficha de ${nombre}`}
      className={`card group flex aspect-square flex-col items-center justify-center gap-1.5 p-2.5 text-center transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
        t.activo ? '' : 'opacity-60'
      }`}
    >
      <Avatar nombre={nombre} semilla={String(t.id)} className="h-14 w-14 text-lg" />
      <div className="min-w-0 max-w-full">
        <p className="truncate text-xs font-semibold text-slate-800">{nombre}</p>
        <p className="truncate text-[11px] text-slate-500">{t.cargo}</p>
      </div>
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          t.activo ? dispClase : 'bg-slate-100 text-slate-500'
        }`}
      >
        {t.activo ? dispTexto : 'Dado de baja'}
      </span>
    </button>
  )
}

export default function Personal() {
  const { puede } = useAuth()
  // La interfaz sigue la matriz de permisos, no el nombre del rol.
  const puedeCrear = puede('trabajadores.crear')
  const puedeEditar = puede('trabajadores.editar')
  const puedeBaja = puede('trabajadores.dar_baja')
  const puedeCatalogos = puede('catalogos.gestionar')
  // HU-33: asignar desde el resultado exige el mismo permiso que asignar en el proyecto (HU-05).
  const puedeAsignar = puede('proyectos.gestionar_acceso')
  const [porAsignar, setPorAsignar] = useState(null)

  const [mapaAbierto, setMapaAbierto] = useState(false)
  const [verFicha, setVerFicha] = useState(null)
  // /personal?ficha=ID abre directamente la ficha de esa persona (enlace desde Proyectos).
  const [parametros] = useSearchParams()
  const fichaPedida = useRef(parametros.get('ficha'))
  const [vista, setVista] = useState(() => {
    const url = valorUrl('vista', ['tarjetas', 'tabla'], null)
    if (url) return url
    try { return localStorage.getItem('personal-vista') === 'tabla' ? 'tabla' : 'tarjetas' } catch { return 'tarjetas' }
  })
  const [orden, setOrden] = useState(() => valorUrl('orden', ORDENES.map((o) => o.value), ''))
  const cambiarVista = (v) => {
    setVista(v)
    try { localStorage.setItem('personal-vista', v) } catch { /* sin storage */ }
  }
  // HU-18: por defecto no se muestran los registros dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(bajaInicial)
  const {
    filtros,
    cambiar: cambiarFiltro,
    limpiar: limpiarFiltros,
    activos: filtrosActivos,
    hayFiltros,
  } = useFiltros(SIN_FILTROS, { inicial: filtrosIniciales(SIN_FILTROS) })

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
        // HU-33: el periodo se envía completo; con una sola fecha no se consulta.
        desde: filtros.desde && filtros.hasta ? filtros.desde : '',
        hasta: filtros.desde && filtros.hasta ? filtros.hasta : '',
      }),
    [incluirInactivos, filtros],
    { mensaje: 'No se pudo cargar el personal.' },
  )

  // Orden y paginación en el cliente; todo el estado del listado queda en la URL.
  const ordenados = useMemo(() => ordenar(personal ?? [], orden), [personal, orden])
  const pag = usePaginacion(ordenados, {
    tamano: 24,
    clave: JSON.stringify([filtros, incluirInactivos, orden]),
    paginaInicial: paginaInicial(),
  })
  useEscribirUrl(
    {
      ...filtros,
      baja: incluirInactivos,
      vista: vista === 'tarjetas' ? '' : vista,
      orden,
      pag: pag.solicitada > 1 ? pag.solicitada : '',
    },
    '/personal',
  )

  useEffect(() => {
    if (!fichaPedida.current || !personal) return
    const t = personal.find((x) => String(x.id) === fichaPedida.current)
    fichaPedida.current = null
    if (t) setVerFicha(t)
  }, [personal])
  useEffect(() => {
    catalogosApi.cargos.listar().then(setCargos).catch(() => {})
    catalogosApi.especialidades.listar().then(setEspecialidades).catch(() => {})
  }, [])

  // Vacaciones o licencia con asignaciones vigentes: se espera la confirmación del usuario.
  // `via` es 'lista' (selector de la tabla) o 'form' (formulario de edición, con su `cuerpo`).
  const [ausencia, setAusencia] = useState(null)
  const [confirmandoAusencia, setConfirmandoAusencia] = useState(false)
  const pideConfirmacion = (e) =>
    e?.response?.status === 409 && e.response.data?.codigo === 'REQUIERE_CONFIRMACION'

  /** Cambiar el estado reemplaza al «dar de baja»: la disponibilidad se deriva. */
  const cambiarEstado = (t, estado, confirmar = false) => {
    if (estado === t.estado) return
    // Si falla se recarga igual, para que el selector vuelva al estado real.
    ejecutar(() => trabajadoresApi.cambiarEstado(t.id, estado, confirmar).catch((e) => {
      if (!pideConfirmacion(e)) throw e
      setAusencia({ via: 'lista', trabajador: t, estado, compromisos: e.response.data.compromisos })
      return null
    }), {
      exito: (respuesta) => {
        if (!respuesta) return ''
        const actualizado = respuesta.trabajador
        return (
          `${t.nombres} ${t.apellidos}: estado ${actualizado.estado}` +
          (Number(actualizado.disponible)
            ? Number(actualizado.actividades_vigentes) > 0
              ? ' · asignado'
              : ' · disponible'
            : ' · no disponible')
        )
      },
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
      if (!trabajador) return trabajadoresApi.crear(cuerpo)
      return trabajadoresApi.actualizar(trabajador.id, cuerpo).catch((e) => {
        if (pideConfirmacion(e)) {
          setAusencia({ via: 'form', trabajador, estado: cuerpo.estado, compromisos: e.response.data.compromisos, cuerpo })
        }
        throw e
      })
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

  /** Confirma el paso a vacaciones/licencia y repite la operación con `confirmar`. */
  const confirmarAusencia = async () => {
    const { via, trabajador: t, estado, cuerpo } = ausencia
    if (via === 'lista') {
      setAusencia(null)
      cambiarEstado(t, estado, true)
      return
    }
    setConfirmandoAusencia(true)
    try {
      await trabajadoresApi.actualizar(t.id, { ...cuerpo, confirmar: true })
      setAusencia(null)
      formulario.cerrar()
      setAviso(`${t.nombres} ${t.apellidos}: información actualizada; pasó a ${estado.toLowerCase()}.`)
      await recargar()
    } catch (e) {
      setAusencia(null)
      formulario.setError(mensajeError(e, 'No se pudo guardar el trabajador.'))
    } finally {
      setConfirmandoAusencia(false)
    }
  }

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
        <SelectorOrden opciones={ORDENES} value={orden} onChange={setOrden} />
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Tipo de vista">
          {[
            ['tarjetas', 'Tarjetas', Squares2X2Icon],
            ['tabla', 'Tabla', TableCellsIcon],
          ].map(([v, texto, Icono]) => (
            <button
              key={v}
              type="button"
              aria-pressed={vista === v}
              aria-label={`Vista de ${texto.toLowerCase()}`}
              title={texto}
              onClick={() => cambiarVista(v)}
              className={`rounded-lg p-2 transition ${
                vista === v ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icono className="h-5 w-5" />
            </button>
          ))}
        </div>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {/* Búsqueda y filtros (corren en la base por el volumen de personal) */}
      <FiltrosDesplegable
        titulo="Buscar personal"
        ariaLabel="Filtros de personal"
        activos={filtrosActivos}
        pie={
          <Interruptor checked={incluirInactivos} onChange={setIncluirInactivos}>
            Dados de baja
          </Interruptor>
        }
        resumen={
          personal !== null
            ? `${personal.length} ${personal.length === 1 ? 'trabajador' : 'trabajadores'} ${hayFiltros ? 'con los filtros' : 'en la lista'}`
            : ''
        }
      >
        <div>
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

        <SeccionFiltros titulo="Situación" icono={UsersIcon}>
          <Segmentado
            etiqueta="Estado"
            nombre="per-estado"
            value={filtros.estado}
            onChange={(v) => cambiarFiltro('estado', v)}
            opciones={[{ value: '', label: 'Todos' }, ...ESTADOS.map((e2) => ({ value: e2.value, label: e2.label }))]}
          />
          <Segmentado
            etiqueta="Disponibilidad"
            nombre="per-disponible"
            value={filtros.disponible}
            onChange={(v) => cambiarFiltro('disponible', v)}
            opciones={[
              { value: '', label: 'Todas' },
              { value: 'libre', label: 'Disponibles' },
              { value: 'asignado', label: 'Asignados' },
              { value: '0', label: 'No disponibles' },
            ]}
          />
        </SeccionFiltros>

        <SeccionFiltros titulo="Perfil" icono={WrenchScrewdriverIcon}>
          <div className="grid">
            <div>
              <label htmlFor="per-cargo" className="label">
                Cargo
              </label>
              <SelectBuscable
                id="per-cargo"
                className="input"
                value={filtros.cargo_id}
                onChange={(e) => cambiarFiltro('cargo_id', e.target.value)}
              >
                <option value="">Todos</option>
                <OpcionesAgrupadas filas={cargos} tipo="cargos" />
              </SelectBuscable>
            </div>
            {/* CU-04 · Alt 2: el personal se filtra por especialidad para tareas específicas. */}
            <div>
              <label htmlFor="per-especialidad" className="label">
                Especialidad
              </label>
              <SelectBuscable
                id="per-especialidad"
                className="input"
                value={filtros.especialidad_id}
                onChange={(e) => cambiarFiltro('especialidad_id', e.target.value)}
              >
                <option value="">Todas</option>
                <OpcionesAgrupadas filas={especialidades} tipo="especialidades" />
              </SelectBuscable>
            </div>
          </div>
        </SeccionFiltros>

        {/* HU-33 · criterio 3: solo quienes no tienen asignaciones solapadas en el periodo. */}
        <SeccionFiltros titulo="Libre en un período" icono={CalendarDaysIcon}>
          <div className="grid">
            <div>
              <label htmlFor="per-desde" className="label">
                Libre desde
              </label>
              <input
                id="per-desde"
                type="date"
                className="input"
                value={filtros.desde}
                max={filtros.hasta || undefined}
                onChange={(e) => cambiarFiltro('desde', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="per-hasta" className="label">
                Libre hasta
              </label>
              <input
                id="per-hasta"
                type="date"
                className="input"
                value={filtros.hasta}
                min={filtros.desde || undefined}
                onChange={(e) => cambiarFiltro('hasta', e.target.value)}
              />
            </div>
          </div>
        </SeccionFiltros>
      </FiltrosDesplegable>

      <ConfirmarAusencia
        pendiente={ausencia}
        enviando={confirmandoAusencia}
        onConfirmar={confirmarAusencia}
        onCancelar={() => setAusencia(null)}
      />

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
              <BotonDarDeBaja onClick={pedirBaja} />
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
              <SelectBuscable
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
              </SelectBuscable>
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
              <SelectBuscable
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
              </SelectBuscable>
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
          <SelectBuscable
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
          </SelectBuscable>
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
            {hayFiltros
              ? (filtros.disponible === 'libre' || (filtros.desde && filtros.hasta))
                ? 'No hay personal disponible para ese criterio'
                : 'Ningún trabajador coincide con la búsqueda'
              : 'Aún no hay personal registrado'}
          </p>
          {hayFiltros && (
            <p className="text-xs text-slate-500">Ajuste o limpie los filtros para ver más.</p>
          )}
        </div>
      )}

      <AsignarPersonal
        trabajador={porAsignar}
        periodo={filtros.desde && filtros.hasta ? { desde: filtros.desde, hasta: filtros.hasta } : null}
        onCerrar={() => setPorAsignar(null)}
        onAsignado={(t) => {
          setPorAsignar(null)
          setAviso(`${t.nombres} ${t.apellidos} fue asignado.`)
          recargar()
        }}
      />

      {personal !== null && personal.length > 0 && vista === 'tarjetas' && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {pag.visibles.map((t) => (
            <TarjetaTrabajador key={t.id} t={t} onAbrir={setVerFicha} />
          ))}
        </div>
      )}
      {personal !== null && personal.length > 0 && vista === 'tarjetas' && pag.paginas > 1 && (
        <div className="card">
          <Paginacion paginacion={pag} />
        </div>
      )}

      {/* Ficha del trabajador: se abre al hacer clic en una tarjeta. */}
      <Modal
        abierto={!!verFicha}
        titulo="Ficha del trabajador"
        onCerrar={() => setVerFicha(null)}
        ancho="max-w-lg"
      >
        {verFicha && (() => {
          const t = verFicha
          const [dispTexto, dispClase] = disponibilidad(t)
          const estadoTxt = t.activo ? (ESTADOS.find((e) => e.value === t.estado)?.label ?? t.estado) : 'Dado de baja'
          // Lo que se necesita para ubicar a la persona va con icono y más grande.
          const contacto = [
            [PhoneIcon, 'Teléfono', t.telefono ? telefonoLegible(t.telefono) : null, t.telefono ? `tel:${t.telefono}` : null],
            [EnvelopeIcon, 'Correo', t.email, t.email ? `mailto:${t.email}` : null],
            [MapPinIcon, 'Dirección', t.direccion, null],
            [IdentificationIcon, 'Documento', `${t.tipo_documento} ${t.numero_documento}`, null],
          ]
          return (
            <>
              <div className="flex items-center gap-4">
                <Avatar nombre={`${t.nombres} ${t.apellidos}`} semilla={String(t.id)} className="h-16 w-16 text-xl" />
                <div className="min-w-0">
                  <h3 className="text-xl font-bold leading-tight text-slate-900">{t.nombres} {t.apellidos}</h3>
                  <p className="mt-0.5 text-sm font-medium text-slate-600">
                    {t.especialidad ? `${t.cargo} · ${t.especialidad}` : t.cargo}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.activo && (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${dispClase}`}>{dispTexto}</span>
                    )}
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.activo ? (ESTADO_BADGE[t.estado] ?? 'bg-slate-100 text-slate-600') : ESTADO_BADGE.INACTIVO}`}>
                      {estadoTxt}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {t.actividades_vigentes ?? 0} {Number(t.actividades_vigentes) === 1 ? 'actividad' : 'actividades'}
                    </span>
                  </div>
                </div>
              </div>
              <ul className="mt-5 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {contacto.map(([Icono, k, v, href]) => (
                  <li key={k} className="flex items-start gap-3 px-4 py-3">
                    <Icono className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-label={k} />
                    {v && href ? (
                      <a href={href} className="break-words text-base font-medium text-slate-800 hover:text-brand-700 hover:underline">{v}</a>
                    ) : (
                      <span className={`break-words ${v ? 'text-base font-medium text-slate-800' : 'text-sm text-slate-400'}`}>{v ?? `Sin ${k.toLowerCase()}`}</span>
                    )}
                  </li>
                ))}
              </ul>
              {(t.activo ? puedeEditar || puedeAsignar : puedeBaja) && (
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  {t.activo ? (
                    <>
                      {puedeEditar && (
                        <button className="btn-primary" onClick={() => { setVerFicha(null); abrirEditar(t) }}>
                          <PencilSquareIcon className="h-4 w-4" /> Editar
                        </button>
                      )}
                      {puedeAsignar && t.estado === 'ACTIVO' && (
                        <button className="btn-ghost" onClick={() => { setVerFicha(null); setPorAsignar(t) }}>
                          <UserPlusIcon className="h-4 w-4" /> Asignar
                        </button>
                      )}
                    </>
                  ) : (
                    <button className="btn-primary" onClick={() => { setVerFicha(null); reactivar(t) }}>
                      <ArrowUturnLeftIcon className="h-4 w-4" /> Reactivar
                    </button>
                  )}
                </div>
              )}
            </>
          )
        })()}
      </Modal>

      {personal !== null && personal.length > 0 && vista === 'tabla' && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={pag.visibles}
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
                  if (t.activo ? !(puedeEditar || puedeAsignar) : !puedeBaja) return null
                  const botones = t.activo ? (
                    <>
                    {puedeEditar && (
                    <button
                      className="btn-accion btn-accion-editar"
                      onClick={() => abrirEditar(t)}
                      aria-label={`Actualizar información de ${t.nombres}`}
                    >
                      <PencilSquareIcon className="h-4 w-4" /> Editar
                    </button>
                    )}
                    {puedeAsignar && t.estado === 'ACTIVO' && (
                      <button
                        className="btn-accion btn-accion-ok"
                        onClick={() => setPorAsignar(t)}
                        aria-label={`Asignar a ${t.nombres} ${t.apellidos}`}
                      >
                        <UserPlusIcon className="h-4 w-4" /> Asignar
                      </button>
                    )}
                    </>
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
