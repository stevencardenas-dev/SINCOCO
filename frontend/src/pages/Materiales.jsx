import { useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  CubeIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import { TablaFicha } from '../components/Ficha.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import FiltrosDesplegable from '../components/FiltrosDesplegable.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { materialesApi } from '../services/materiales'
import { useRecurso } from '../hooks/useRecurso'
import { useFiltros } from '../hooks/useFiltros'
import { useFormulario } from '../hooks/useFormulario'
import { fmtCOP, fmtFecha } from '../lib/format.js'

/**
 * HU-07 (CU-07): catálogo de materiales con su código, categoría, unidad,
 * costo de referencia y nivel mínimo de existencia.
 *
 * Reglas que viven en el backend y aquí solo se reflejan:
 *   - el código es obligatorio, alfanumérico y único (se guarda en mayúsculas);
 *   - todo material requiere una categoría y una unidad de medida válidas;
 *   - el nivel mínimo es el umbral de las alertas de stock;
 *   - la existencia nace en cero y no se edita aquí: la mueven las entradas,
 *     salidas, traslados y devoluciones de inventario;
 *   - dar de baja (HU-18) no se permite mientras haya existencia en bodega.
 */

const VACIO = {
  codigo: '',
  categoria_id: '',
  descripcion: '',
  unidad_medida: '',
  costo_referencia: '',
  nivel_minimo: '',
}

const SIN_FILTROS = { buscar: '', categoria_id: '', bajo_minimo: '' }

const cantidad = (n) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(n ?? 0))

export default function Materiales() {
  const { puede } = useAuth()
  const puedeCrear = puede('materiales.crear')
  const puedeEditar = puede('materiales.editar')
  const puedeBaja = puede('materiales.dar_baja')

  // HU-18: por defecto no se muestran los materiales dados de baja.
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [unidades, setUnidades] = useState([])
  const {
    filtros,
    cambiar: cambiarFiltro,
    limpiar: limpiarFiltros,
    activos: filtrosActivos,
    hayFiltros,
  } = useFiltros(SIN_FILTROS)

  const {
    datos: materiales,
    error,
    setError,
    aviso,
    setAviso,
    recargar,
    ejecutar,
  } = useRecurso(
    () =>
      materialesApi.listar({
        incluirInactivos,
        buscar: filtros.buscar,
        categoria_id: filtros.categoria_id,
        bajo_minimo: filtros.bajo_minimo === '1',
      }),
    [incluirInactivos, filtros],
    { mensaje: 'No se pudo cargar el catálogo de materiales.' },
  )

  useEffect(() => {
    materialesApi.categorias().then(setCategorias).catch(() => {})
    materialesApi.unidades().then(setUnidades).catch(() => {})
  }, [])

  /** CU-07: registrar o actualizar. `registro` es el material en edición (null = nuevo). */
  const formulario = useFormulario(VACIO, {
    enviar: (f, material) => {
      const cuerpo = {
        ...f,
        categoria_id: f.categoria_id ? Number(f.categoria_id) : '',
        costo_referencia: f.costo_referencia === '' ? '' : Number(f.costo_referencia),
        nivel_minimo: f.nivel_minimo === '' ? '' : Number(f.nivel_minimo),
      }
      return material ? materialesApi.actualizar(material.id, cuerpo) : materialesApi.crear(cuerpo)
    },
    alGuardar: ({ material: m }, { registro }) => {
      setAviso(
        registro
          ? `${m.codigo} · ${m.descripcion}: información actualizada.`
          : `${m.codigo} · ${m.descripcion} registrado en el catálogo.`,
      )
      return recargar()
    },
    error: 'No se pudo guardar el material.',
  })
  const form = formulario.valores
  const editando = formulario.registro
  const campo = formulario.claseCampo

  /** HU-18: confirmación de «Dar de baja» (`registro` es el material). */
  const baja = useFormulario(null, {
    enviar: (_, m) => materialesApi.baja(m.id),
    alGuardar: (_, { registro: m }) => {
      formulario.cerrar()
      setError('')
      setAviso(`${m.codigo} · ${m.descripcion} se dio de baja del catálogo.`)
      return recargar()
    },
    error: 'No se pudo dar de baja el material.',
  })
  const porDarDeBaja = baja.registro

  const abrirEditar = (m) => {
    setAviso('')
    formulario.abrir(
      {
        codigo: m.codigo ?? '',
        categoria_id: String(m.categoria_id ?? ''),
        descripcion: m.descripcion ?? '',
        unidad_medida: m.unidad_medida ?? '',
        costo_referencia: String(m.costo_referencia ?? ''),
        nivel_minimo: String(m.nivel_minimo ?? ''),
      },
      m,
    )
  }

  const reactivar = (m) =>
    ejecutar(() => materialesApi.reactivar(m.id), {
      exito: () => `Se reactivó ${m.codigo} · ${m.descripcion}.`,
      error: 'No se pudo reactivar el material.',
    })

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={recargar} />}
        title="Materiales"
        subtitle="Catálogo de materiales con su código, unidad, costo de referencia y nivel mínimo"
      >
        {puedeCrear && (
          <button className="btn-primary" onClick={() => formulario.abrir()}>
            <PlusIcon className="h-5 w-5" /> Nuevo material
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
      </PageHeader>

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      <FiltrosDesplegable titulo="Buscar materiales" ariaLabel="Filtros de materiales" activos={filtrosActivos}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label htmlFor="mat-buscar" className="label">
              Búsqueda
            </label>
            <input
              id="mat-buscar"
              type="search"
              className="input"
              placeholder="Código o descripción"
              value={filtros.buscar}
              onChange={(e) => cambiarFiltro('buscar', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="mat-categoria" className="label">
              Categoría
            </label>
            <select
              id="mat-categoria"
              className="input"
              value={filtros.categoria_id}
              onChange={(e) => cambiarFiltro('categoria_id', e.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mat-stock" className="label">
              Existencia
            </label>
            <select
              id="mat-stock"
              className="input"
              value={filtros.bajo_minimo}
              onChange={(e) => cambiarFiltro('bajo_minimo', e.target.value)}
            >
              <option value="">Todas</option>
              <option value="1">En o bajo el nivel mínimo</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-ghost" disabled={!hayFiltros} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>
        {materiales !== null && (
          <p className="text-xs text-slate-500">
            {materiales.length} {materiales.length === 1 ? 'material' : 'materiales'}{' '}
            {hayFiltros ? 'con los filtros aplicados' : 'en la lista'}
          </p>
        )}
      </FiltrosDesplegable>

      {(puedeCrear || puedeEditar) && (
        <ModalFormulario
          {...formulario.propsModal}
          titulo={editando ? 'Actualizar material' : 'Registrar material'}
          subtitulo={
            editando
              ? 'El cambio queda registrado en la bitácora de trazabilidad'
              : 'La existencia inicia en cero y se mueve con las entradas de inventario'
          }
          ancho="max-w-3xl"
          textoGuardar={editando ? 'Guardar cambios' : 'Registrar material'}
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
              <label htmlFor="m-codigo" className="label">
                Código
              </label>
              <input
                id="m-codigo"
                maxLength={30}
                autoComplete="off"
                className={campo('codigo')}
                value={form.codigo}
                onChange={(e) => formulario.cambiar('codigo', e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">Solo letras y números; único por material.</p>
            </div>
            <div>
              <label htmlFor="m-categoria" className="label">
                Categoría
              </label>
              <select
                id="m-categoria"
                className={campo('categoria_id')}
                value={form.categoria_id}
                onChange={(e) => formulario.cambiar('categoria_id', e.target.value)}
                required
              >
                <option value="">Seleccione una categoría…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="m-descripcion" className="label">
                Descripción
              </label>
              <input
                id="m-descripcion"
                maxLength={255}
                className={campo('descripcion')}
                value={form.descripcion}
                onChange={(e) => formulario.cambiar('descripcion', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="m-unidad" className="label">
                Unidad de medida
              </label>
              <select
                id="m-unidad"
                className={campo('unidad_medida')}
                value={form.unidad_medida}
                onChange={(e) => formulario.cambiar('unidad_medida', e.target.value)}
                required
              >
                <option value="">Seleccione una unidad…</option>
                {unidades.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="m-costo" className="label">
                Costo de referencia (COP)
              </label>
              <input
                id="m-costo"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className={campo('costo_referencia')}
                value={form.costo_referencia}
                onChange={(e) => formulario.cambiar('costo_referencia', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="m-minimo" className="label">
                Nivel mínimo
              </label>
              <input
                id="m-minimo"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className={campo('nivel_minimo')}
                value={form.nivel_minimo}
                onChange={(e) => formulario.cambiar('nivel_minimo', e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Con esta existencia o menos se genera la alerta de stock (0 = sin alerta).
              </p>
            </div>
            {editando && (
              <div>
                <span className="label">Existencia actual</span>
                <p className="input cursor-not-allowed bg-slate-50 tabular-nums text-slate-600">
                  {cantidad(editando.existencia_total)} {editando.unidad_medida}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Solo cambia con entradas, salidas, traslados y devoluciones.
                </p>
              </div>
            )}
          </div>
        </ModalFormulario>
      )}

      {/* Confirmación de «Dar de baja» (HU-18), encima del formulario de edición. */}
      <Modal
        abierto={baja.abierto}
        titulo={porDarDeBaja ? `¿Dar de baja ${porDarDeBaja.codigo} · ${porDarDeBaja.descripcion}?` : ''}
        onCerrar={() => !baja.guardando && baja.cerrar()}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">Al dar de baja este material:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Deja de aparecer en el catálogo y no se puede usar en nuevos movimientos.</li>
          <li>No se borra nada: se conserva su historial y se puede reactivar desde «Incluir dados de baja».</li>
        </ul>
        <p className="mt-3 rounded-xl bg-accent-50 px-4 py-3 text-xs text-brand-800 ring-1 ring-accent-200">
          Si todavía hay existencia en bodega, primero hay que registrar su salida o traslado.
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

      {materiales === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando materiales…
        </div>
      )}

      {materiales !== null && materiales.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <CubeIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            {hayFiltros ? 'Ningún material coincide con la búsqueda' : 'Aún no hay materiales registrados'}
          </p>
          {hayFiltros && <p className="text-xs text-slate-500">Ajuste o limpie los filtros para ver más.</p>}
        </div>
      )}

      {materiales !== null && materiales.length > 0 && (
        <div className="card overflow-hidden">
          <TablaFicha
            filas={materiales}
            minWidth="md:min-w-[900px]"
            filaClase={() => 'transition hover:bg-slate-50/70'}
            ficha={{
              titulo: (m) => m.descripcion,
              subtitulo: (m) => m.codigo,
            }}
            columnas={[
              {
                titulo: 'Código',
                tdClase: 'font-medium tabular-nums text-slate-800',
                celda: (m) => m.codigo,
              },
              {
                titulo: 'Material',
                movil: true,
                tdClase: 'text-slate-700',
                celda: (m) => (
                  <>
                    {m.descripcion}
                    <span className="block text-xs tabular-nums text-slate-400 md:hidden">{m.codigo}</span>
                    {!m.activo && (
                      <span className="badge ml-2 bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                        Dado de baja
                      </span>
                    )}
                    {!m.activo && m.fecha_baja && (
                      <p className="text-xs text-slate-400">Desde {fmtFecha(m.fecha_baja)}</p>
                    )}
                  </>
                ),
              },
              { titulo: 'Categoría', tdClase: 'text-slate-600', celda: (m) => m.categoria },
              { titulo: 'Unidad', tdClase: 'text-slate-600', celda: (m) => m.unidad_medida },
              {
                titulo: 'Existencia',
                movil: true,
                tdClase: 'tabular-nums text-slate-700',
                celda: (m) => (
                  <>
                    {cantidad(m.existencia_total)}
                    {m.bajo_minimo && (
                      <span className="badge ml-2 bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        Bajo mínimo
                      </span>
                    )}
                  </>
                ),
              },
              {
                titulo: 'Nivel mínimo',
                tdClase: 'tabular-nums text-slate-600',
                celda: (m) => cantidad(m.nivel_minimo),
              },
              {
                titulo: 'Costo ref.',
                tdClase: 'tabular-nums text-slate-600',
                celda: (m) => fmtCOP(m.costo_referencia),
              },
              {
                titulo: 'Acciones',
                acciones: true,
                // Un material dado de baja es historial: no se edita, solo se reactiva.
                celda: (m, enFicha) => {
                  if (m.activo ? !puedeEditar : !puedeBaja) return null
                  const botones = m.activo ? (
                    <button
                      className="btn-accion btn-accion-editar"
                      onClick={() => abrirEditar(m)}
                      aria-label={`Actualizar ${m.codigo}`}
                    >
                      <PencilSquareIcon className="h-4 w-4" /> Editar
                    </button>
                  ) : (
                    <button
                      className="btn-accion btn-accion-ok"
                      onClick={() => reactivar(m)}
                      aria-label={`Reactivar ${m.codigo}`}
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
