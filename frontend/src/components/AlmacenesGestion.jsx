import { useState } from 'react'
import { ArrowPathIcon, BuildingStorefrontIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'
import ModalFormulario from './ModalFormulario.jsx'
import BotonActualizar from './BotonActualizar.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import PageHeader from './PageHeader.jsx'
import { TablaFicha } from './Ficha.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { herramientasApi } from '../services/herramientas'
import { useRecurso } from '../hooks/useRecurso'
import { useFormulario } from '../hooks/useFormulario'

/**
 * Gestión de almacenes (pestaña de Herramientas): crear, editar y dar de baja,
 * con la misma mecánica que Gestión Administrativa. La baja es lógica y no se
 * permite mientras el almacén tenga herramientas activas. Usa los permisos de
 * herramientas (`crear` / `editar` / `dar_baja`).
 */

const VACIO = { codigo: '', nombre: '', ubicacion: '', es_central: false }

export default function AlmacenesGestion({ pestanas }) {
  const { puede } = useAuth()
  const puedeCrear = puede('herramientas.crear')
  const puedeEditar = puede('herramientas.editar')
  const puedeBaja = puede('herramientas.dar_baja')

  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [porEliminar, setPorEliminar] = useState(null)

  const { datos, error, aviso, setAviso, recargar, ejecutar } = useRecurso(
    () => herramientasApi.almacenesGestion.listar({ incluirInactivos }),
    [incluirInactivos],
    { mensaje: 'No se pudieron cargar los almacenes.' },
  )

  const formulario = useFormulario(VACIO, {
    enviar: (f, fila) => {
      const cuerpo = { ...f, es_central: Boolean(f.es_central) }
      return fila
        ? herramientasApi.almacenesGestion.actualizar(fila.id, cuerpo)
        : herramientasApi.almacenesGestion.crear(cuerpo)
    },
    alGuardar: ({ almacen }, { registro }) => {
      setAviso(registro ? `Almacén ${almacen.nombre} actualizado.` : `Almacén ${almacen.nombre} registrado.`)
      return recargar()
    },
    error: 'No se pudo guardar el almacén.',
  })
  const form = formulario.valores
  const editando = formulario.registro !== null
  const campo = formulario.claseCampo

  const abrirEditar = (a) => {
    setAviso('')
    formulario.abrir(
      { codigo: a.codigo ?? '', nombre: a.nombre ?? '', ubicacion: a.ubicacion ?? '', es_central: Number(a.es_central) === 1 },
      a,
    )
  }

  const eliminar = async () => {
    const a = porEliminar
    setPorEliminar(null)
    await ejecutar(() => herramientasApi.almacenesGestion.baja(a.id), {
      exito: `Se dio de baja el almacén "${a.nombre}".`,
      error: 'No se pudo dar de baja el almacén.',
    })
  }

  const reactivar = (a) =>
    ejecutar(() => herramientasApi.almacenesGestion.reactivar(a.id), {
      exito: `Se reactivó el almacén "${a.nombre}".`,
      error: 'No se pudo reactivar el almacén.',
    })

  const totalActivos = (datos ?? []).filter((a) => Number(a.activo) === 1).length

  return (
    <div className="space-y-6">
      <PageHeader
        accion={<BotonActualizar onClick={recargar} />}
        title="Herramientas"
        subtitle="Almacenes donde se guardan las herramientas"
      >
        {puedeCrear && (
          <button type="button" className="btn-primary" onClick={() => formulario.abrir()}>
            <PlusIcon className="h-5 w-5" /> Nuevo almacén
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setIncluirInactivos((v) => !v)}>
          {incluirInactivos ? 'Ocultar dados de baja' : 'Incluir dados de baja'}
        </button>
      </PageHeader>

      {pestanas}

      {error && <AlertaFormulario mensaje={error} />}
      {aviso && <AlertaFormulario tipo="aviso" mensaje={aviso} />}

      {datos === null && !error && (
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando almacenes…
        </div>
      )}

      {datos !== null && datos.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <BuildingStorefrontIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay almacenes registrados</p>
        </div>
      )}

      {datos !== null && datos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
            {totalActivos} activos de {datos.length} almacenes
          </div>
          <TablaFicha
            filas={datos}
            minWidth="md:min-w-[720px]"
            filaClase={(a) => `transition hover:bg-slate-50/70 ${a.activo ? '' : 'bg-slate-50/60'}`}
            ficha={{ titulo: (a) => a.nombre, subtitulo: (a) => a.codigo }}
            columnas={[
              { titulo: 'Código', movil: true, tdClase: 'font-medium tabular-nums text-slate-800', celda: (a) => a.codigo },
              {
                titulo: 'Almacén',
                movil: true,
                tdClase: 'text-slate-700',
                celda: (a) => (
                  <>
                    <span className="font-semibold text-slate-800">{a.nombre}</span>
                    {Number(a.es_central) === 1 && (
                      <span className="badge ml-2 bg-accent-50 text-brand-700 ring-1 ring-accent-200">Central</span>
                    )}
                  </>
                ),
              },
              { titulo: 'Ubicación', tdClase: 'text-slate-600', celda: (a) => a.ubicacion ?? '—' },
              {
                titulo: 'Herramientas',
                tdClase: 'tabular-nums text-slate-600',
                celda: (a) => (Number(a.en_uso) > 0 ? a.en_uso : '—'),
                orden: (a) => Number(a.en_uso),
              },
              {
                titulo: 'Estado',
                celda: (a) => (
                  <span
                    className={`badge badge-tabla ring-1 ${
                      a.activo
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                    }`}
                  >
                    {a.activo ? 'Activo' : 'Dado de baja'}
                  </span>
                ),
              },
              ...(puedeEditar || puedeBaja
                ? [
                    {
                      titulo: 'Acciones',
                      acciones: true,
                      derecha: true,
                      celda: (a, enFicha) => {
                        const botones = (
                          <>
                            {a.activo && puedeEditar && (
                              <button type="button" className="btn-ghost text-xs" onClick={() => abrirEditar(a)}>
                                <PencilSquareIcon className="h-4 w-4" /> Editar
                              </button>
                            )}
                            {a.activo && puedeBaja && (
                              <button type="button" className="btn-ghost text-xs" onClick={() => setPorEliminar(a)}>
                                <TrashIcon className="h-4 w-4" /> Eliminar
                              </button>
                            )}
                            {!a.activo && puedeBaja && (
                              <button type="button" className="btn-ghost text-xs" onClick={() => reactivar(a)}>
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

      <ModalFormulario
        {...formulario.propsModal}
        titulo={editando ? 'Editar almacén' : 'Nuevo almacén'}
        subtitulo="Aparece de inmediato en el formulario de herramientas"
        textoGuardar={editando ? 'Guardar cambios' : 'Agregar'}
        espaciado="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="alm-codigo" className="label">Código</label>
            <input id="alm-codigo" className={campo('codigo')} maxLength={20} value={form.codigo} required
              onChange={(e) => formulario.cambiar('codigo', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="alm-nombre" className="label">Nombre</label>
            <input id="alm-nombre" className={campo('nombre')} maxLength={100} value={form.nombre} required
              onChange={(e) => formulario.cambiar('nombre', e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="alm-ubicacion" className="label">Ubicación</label>
          <input id="alm-ubicacion" className={campo('ubicacion')} maxLength={255} value={form.ubicacion}
            onChange={(e) => formulario.cambiar('ubicacion', e.target.value)} />
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300"
            checked={Boolean(form.es_central)}
            onChange={(e) => formulario.cambiar('es_central', e.target.checked)} />
          <span>Es almacén central</span>
        </label>
      </ModalFormulario>

      <Modal
        abierto={porEliminar !== null}
        titulo="¿Eliminar el almacén?"
        onCerrar={() => setPorEliminar(null)}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">
          «{porEliminar?.nombre}» dejará de ofrecerse al registrar herramientas. No se borra de la
          base: se marca como dado de baja y se puede reactivar.
        </p>
        {porEliminar && Number(porEliminar.en_uso) > 0 && (
          <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            Tiene {porEliminar.en_uso} {Number(porEliminar.en_uso) === 1 ? 'herramienta activa' : 'herramientas activas'}:
            no se podrá dar de baja hasta que se cambien de almacén o se den de baja.
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
