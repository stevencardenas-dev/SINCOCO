import { Fragment, useState } from 'react'
import {
  ArrowPathIcon,
  CheckIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal.jsx'
import ModalFormulario from '../components/ModalFormulario.jsx'
import BotonActualizar from '../components/BotonActualizar.jsx'
import AlertaFormulario from '../components/AlertaFormulario.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { rolesApi } from '../services/roles'
import { useRecurso } from '../hooks/useRecurso'
import { useFormulario } from '../hooks/useFormulario'
import { mensajeError } from '../lib/errores.js'

/**
 * HU-01 · criterio 4 (RF01 · RNF05): administración de la matriz rol → permiso.
 *
 * Pantalla del administrador. No inventa la matriz: muestra exactamente el
 * contenido de `roles_permisos`, que es lo que decide el acceso en el backend
 * (`requirePermiso`). Aquí el administrador:
 *   - crea, edita y elimina roles (un rol con usuarios asignados no se elimina),
 *   - marca y desmarca los permisos de cada rol.
 *
 * Los cuatro roles base del sistema no se renombran ni se eliminan: el código
 * de la interfaz los nombra. Su descripción y sus permisos sí se administran.
 */

const ROL_LABEL = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  MAESTRO_OBRA: 'Maestro de obra',
  ENCARGADO_BODEGA: 'Encargado de bodega',
}

const MODULO_LABEL = {
  usuarios: 'Usuarios, roles y accesos',
  personal: 'Personal',
  proyectos: 'Proyectos',
  planificacion: 'Planificación',
  clientes: 'Clientes',
  auditoria: 'Auditoría y trazabilidad',
  catalogos: 'Gestión Administrativa',
}

// Orden de negocio de los módulos, no alfabético.
const MODULO_ORDEN = ['usuarios', 'personal', 'proyectos', 'planificacion', 'clientes', 'catalogos', 'auditoria']

const ordenModulo = (modulo) => {
  const i = MODULO_ORDEN.indexOf(modulo)
  return i === -1 ? MODULO_ORDEN.length : i
}

const ROL_VACIO = { nombre: '', descripcion: '' }

export default function RolesPermisos() {
  const { datos, setDatos, error, recargar } = useRecurso(rolesApi.matriz, [], {
    mensaje: 'No se pudo cargar la matriz de roles y permisos.',
  })
  const [filtro, setFiltro] = useState('')
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  // Celular: en vez de la matriz, se elige un rol y se ven sus permisos.
  const [rolVerId, setRolVerId] = useState(null)

  // Alta/edición de roles: `registro` es el rol que se edita (null = nuevo).
  const formRol = useFormulario(ROL_VACIO, {
    enviar: (form, rol) => (rol ? rolesApi.actualizar(rol.id, form) : rolesApi.crear(form)),
    alGuardar: () => recargar(),
    error: 'No se pudo guardar el rol.',
  })

  // Eliminación: `registro` es el rol por eliminar.
  const eliminacion = useFormulario(null, {
    enviar: (_, rol) => rolesApi.eliminar(rol.id),
    alGuardar: () => recargar(),
    error: 'No se pudo eliminar el rol.',
  })

  const [errorPermiso, setErrorPermiso] = useState('')

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader accion={<BotonActualizar onClick={recargar} />} title="Roles y permisos" subtitle="Matriz rol → permiso" />
        <AlertaFormulario mensaje={error} />
      </div>
    )
  }

  if (!datos) {
    return (
      <div className="space-y-6">
        <PageHeader title="Roles y permisos" subtitle="Matriz rol → permiso" />
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando matriz…
        </div>
      </div>
    )
  }

  const { roles, permisos, asignaciones } = datos

  const concedido = new Set(asignaciones.map((a) => `${a.rol_id}:${a.permiso_id}`))

  const texto = filtro.trim().toLowerCase()
  const visibles = texto
    ? permisos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(texto) ||
          (p.descripcion ?? '').toLowerCase().includes(texto),
      )
    : permisos

  const modulos = [...new Set(visibles.map((p) => p.modulo ?? 'otros'))].sort(
    (a, b) => ordenModulo(a) - ordenModulo(b) || a.localeCompare(b),
  )

  const totalConcedidos = asignaciones.length
  const rolVer = roles.find((r) => r.id === rolVerId) ?? null

  const abrirEditar = (rol) => formRol.abrir({ nombre: rol.nombre, descripcion: rol.descripcion ?? '' }, rol)
  const editandoRol = formRol.registro
  const porEliminar = eliminacion.registro

  /** Marca o desmarca un permiso: se guarda de inmediato el conjunto del rol. */
  const alternarPermiso = async (rol, permiso) => {
    setErrorPermiso('')
    const actuales = asignaciones.filter((a) => a.rol_id === rol.id).map((a) => a.permiso_id)
    const tiene = concedido.has(`${rol.id}:${permiso.id}`)
    const nuevos = tiene
      ? actuales.filter((id) => id !== permiso.id)
      : [...actuales, permiso.id]

    // Actualización optimista: si falla, se recarga la matriz desde la base.
    setDatos((prev) => ({
      ...prev,
      asignaciones: tiene
        ? prev.asignaciones.filter((a) => !(a.rol_id === rol.id && a.permiso_id === permiso.id))
        : [...prev.asignaciones, { rol_id: rol.id, permiso_id: permiso.id }],
      roles: prev.roles.map((r) =>
        r.id === rol.id ? { ...r, permisos_activos: nuevos.length } : r,
      ),
    }))

    try {
      await rolesApi.asignarPermisos(rol.id, nuevos)
    } catch (err) {
      setErrorPermiso(mensajeError(err, 'No se pudo actualizar el permiso.'))
      recargar()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles y permisos"
        subtitle="Qué puede hacer cada rol en el sistema"
      >
        <button
          type="button"
          className="btn-ghost px-3"
          title="Filtrar permisos"
          aria-label="Filtrar permisos"
          aria-expanded={filtroAbierto}
          onClick={() => setFiltroAbierto((v) => !v)}
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          {filtro && <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden="true" />}
        </button>
        <button type="button" className="btn-primary" onClick={() => formRol.abrir()}>
          <PlusIcon className="h-5 w-5" /> Nuevo rol
        </button>
      </PageHeader>

      {filtroAbierto && (
        <input
          type="search"
          className="input"
          placeholder="Filtrar permiso…"
          aria-label="Filtrar permisos"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          autoFocus
        />
      )}

      <AlertaFormulario mensaje={errorPermiso} />

      {/* Resumen por rol, con sus acciones de administración */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {roles.map((r) => (
          <div key={r.id} className="card flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p
                className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-900"
                title={r.es_sistema ? 'Rol base del sistema' : undefined}
              >
                <KeyIcon className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="truncate">{ROL_LABEL[r.nombre] ?? r.nombre}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {r.permisos_activos}/{permisos.length} permisos · {r.usuarios}{' '}
                {r.usuarios === 1 ? 'cuenta' : 'cuentas'}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                title="Editar rol"
                aria-label={`Editar rol ${r.nombre}`}
                onClick={() => abrirEditar(r)}
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              {!r.es_sistema && (
                <button
                  type="button"
                  className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                  title="Eliminar rol"
                  aria-label={`Eliminar rol ${r.nombre}`}
                  onClick={() => eliminacion.abrir(null, r)}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Celular: lista de roles; cada uno abre sus permisos. */}
      <div className="card p-5 md:hidden">
        <h3 className="text-base font-semibold text-slate-900">Ver permisos por rol</h3>
        <p className="mt-1 text-xs text-slate-500">Elija un rol para ver y administrar sus permisos.</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {roles.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setRolVerId(r.id)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span className="text-sm font-semibold text-slate-800">{ROL_LABEL[r.nombre] ?? r.nombre}</span>
                <span className="text-xs text-slate-500">
                  {r.permisos_activos} / {permisos.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Matriz editable (escritorio) */}
      <div className="card hidden overflow-hidden md:block">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Matriz rol → permiso</h3>
          <p className="text-xs text-slate-500">
            {permisos.length} permisos · {roles.length} roles · {totalConcedidos} asignaciones ·
            haga clic en una casilla para conceder o quitar
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Permiso
                </th>
                {roles.map((r) => (
                  <th
                    key={r.id}
                    scope="col"
                    className="w-32 px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {ROL_LABEL[r.nombre] ?? r.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modulos.map((modulo) => (
                <Fragment key={modulo}>
                  <tr className="bg-slate-50/70">
                    <td
                      colSpan={roles.length + 1}
                      className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {MODULO_LABEL[modulo] ?? modulo}
                    </td>
                  </tr>
                  {visibles
                    .filter((p) => (p.modulo ?? 'otros') === modulo)
                    .map((p) => (
                      <tr key={p.id} data-permiso={p.nombre} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <p className="font-mono text-xs font-semibold text-slate-800">{p.nombre}</p>
                          <p className="text-xs text-slate-500">{p.descripcion}</p>
                        </td>
                        {roles.map((r) => {
                          const tiene = concedido.has(`${r.id}:${p.id}`)
                          const etiqueta = `${ROL_LABEL[r.nombre] ?? r.nombre} ${
                            tiene ? 'sí' : 'no'
                          } tiene ${p.nombre}`
                          return (
                            <td
                              key={r.id}
                              data-rol={r.nombre}
                              data-concedido={tiene ? '1' : '0'}
                              className="px-3 py-3.5 text-center"
                            >
                              <button
                                type="button"
                                title={etiqueta}
                                aria-label={etiqueta}
                                aria-pressed={tiene}
                                onClick={() => alternarPermiso(r, p)}
                                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                                  tiene
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-slate-200 bg-white text-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {tiene ? <CheckIcon className="h-4 w-4" /> : '—'}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {visibles.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Ningún permiso coincide con «{filtro}».
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Leída de la base el {new Date(datos.generado_en).toLocaleString('es-CO')} ·{' '}
        {totalConcedidos} filas en roles_permisos
      </p>

      {/* Permisos de un rol (celular) */}
      <Modal
        abierto={rolVer != null}
        titulo={rolVer ? `Permisos: ${ROL_LABEL[rolVer.nombre] ?? rolVer.nombre}` : ''}
        subtitulo={rolVer ? `${rolVer.permisos_activos} de ${permisos.length} permisos concedidos` : ''}
        onCerrar={() => setRolVerId(null)}
      >
        {rolVer && (
          <div className="space-y-4">
            {modulos.map((modulo) => (
              <div key={modulo}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {MODULO_LABEL[modulo] ?? modulo}
                </p>
                <ul className="divide-y divide-slate-100">
                  {visibles
                    .filter((p) => (p.modulo ?? 'otros') === modulo)
                    .map((p) => {
                      const tiene = concedido.has(`${rolVer.id}:${p.id}`)
                      return (
                        <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <p className="break-all font-mono text-xs font-semibold text-slate-800">{p.nombre}</p>
                            <p className="text-xs text-slate-500">{p.descripcion}</p>
                          </div>
                          <button
                            type="button"
                            aria-pressed={tiene}
                            aria-label={`${tiene ? 'Quitar' : 'Conceder'} ${p.nombre}`}
                            onClick={() => alternarPermiso(rolVer, p)}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                              tiene
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-300'
                            }`}
                          >
                            {tiene ? <CheckIcon className="h-4 w-4" /> : '—'}
                          </button>
                        </li>
                      )
                    })}
                </ul>
              </div>
            ))}
            <AlertaFormulario mensaje={errorPermiso} />
          </div>
        )}
      </Modal>

      {/* Crear / editar rol */}
      <ModalFormulario
        {...formRol.propsModal}
        titulo={editandoRol ? 'Editar rol' : 'Nuevo rol'}
        subtitulo="El rol nuevo nace sin permisos: se los asigna en la matriz"
        textoGuardar={editandoRol ? 'Guardar cambios' : 'Crear rol'}
        espaciado="space-y-4"
      >
        <div>
          <label htmlFor="rol-nombre" className="label">
            Nombre
          </label>
          <input
            id="rol-nombre"
            className={`${formRol.claseCampo('nombre')} uppercase`}
            value={formRol.valores.nombre}
            disabled={Boolean(editandoRol?.es_sistema)}
            onChange={(e) => formRol.cambiar('nombre', e.target.value)}
            required
            minLength={3}
            maxLength={50}
          />
          <p className="mt-1 text-xs text-slate-500">
            Se guarda en mayúsculas. Solo letras, números, espacios y guion bajo.
          </p>
        </div>
        <div>
          <label htmlFor="rol-descripcion" className="label">
            Descripción
          </label>
          <input
            id="rol-descripcion"
            maxLength={255}
            className="input"
            value={formRol.valores.descripcion}
            onChange={(e) => formRol.cambiar('descripcion', e.target.value)}
          />
        </div>
      </ModalFormulario>

      {/* Confirmación de eliminación */}
      <Modal
        abierto={eliminacion.abierto}
        titulo={`¿Eliminar el rol ${porEliminar?.nombre ?? ''}?`}
        onCerrar={eliminacion.cerrar}
        ancho="max-w-md"
      >
        <p className="text-sm text-slate-600">
          El rol desaparece junto con sus permisos. Solo se puede eliminar si ningún usuario lo tiene
          asignado.
        </p>
        {porEliminar && porEliminar.usuarios > 0 && (
          <p className="mt-3 rounded-xl bg-accent-50 px-4 py-3 text-xs text-brand-800 ring-1 ring-accent-200">
            Tiene {porEliminar.usuarios} {porEliminar.usuarios === 1 ? 'cuenta' : 'cuentas'}{' '}
            asignada(s): reasígnelas antes de eliminarlo.
          </p>
        )}
        <AlertaFormulario mensaje={eliminacion.error} />
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-primary disabled:opacity-60"
            disabled={eliminacion.guardando}
            onClick={eliminacion.guardar}
          >
            {eliminacion.guardando ? 'Eliminando…' : 'Eliminar'}
          </button>
          <button type="button" className="btn-ghost" onClick={eliminacion.cerrar}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}
