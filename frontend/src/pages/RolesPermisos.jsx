import { Fragment, useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  CheckIcon,
  KeyIcon,
  LockClosedIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import api from '../services/api'

/**
 * HU-01 · criterio 4 (RF01 · RNF05): monitoreo de la matriz rol -> permiso.
 *
 * Pantalla de solo lectura para el administrador. No inventa la matriz: muestra
 * exactamente el contenido de `roles_permisos`, que es lo que decide el acceso
 * en el backend (`requirePermiso`). Si aquí se ve una marca, ese rol pasa el
 * filtro; si no, recibe 403. La matriz se carga desde
 * docs/seed_permisos_prueba.sql, que es su única fuente de verdad.
 */

const ROL_LABEL = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  MAESTRO_OBRA: 'Maestro de obra',
  ENCARGADO_BODEGA: 'Encargado de bodega',
}

const MODULO_LABEL = {
  usuarios: 'Usuarios y accesos',
  personal: 'Personal',
  proyectos: 'Proyectos',
  planificacion: 'Planificación',
  clientes: 'Clientes',
  auditoria: 'Auditoría y trazabilidad',
}

// Orden de negocio de los módulos, no alfabético.
const MODULO_ORDEN = ['usuarios', 'personal', 'proyectos', 'planificacion', 'clientes', 'auditoria']

const ordenModulo = (modulo) => {
  const i = MODULO_ORDEN.indexOf(modulo)
  return i === -1 ? MODULO_ORDEN.length : i
}

export default function RolesPermisos() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('')

  const cargar = () => {
    setError('')
    api
      .get('/roles/permisos')
      .then((res) => setDatos(res.data))
      .catch((err) =>
        setError(
          err.response?.data?.error ?? 'No se pudo cargar la matriz de roles y permisos.',
        ),
      )
  }

  useEffect(cargar, [])

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Roles y permisos" subtitle="Matriz rol → permiso · RF01 · RNF05" />
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      </div>
    )
  }

  if (!datos) {
    return (
      <div className="space-y-6">
        <PageHeader title="Roles y permisos" subtitle="Matriz rol → permiso · RF01 · RNF05" />
        <div className="card flex items-center gap-3 px-6 py-12 text-sm text-slate-500">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-brand-600" /> Cargando matriz…
        </div>
      </div>
    )
  }

  const { roles, permisos, asignaciones } = datos

  // Índice de concesiones: `${rol_id}:${permiso_id}` -> true. Se construye desde
  // las asignaciones que devuelve la API, no desde un cálculo de negocio.
  const concedido = new Set(asignaciones.map((a) => `${a.rol_id}:${a.permiso_id}`))

  const texto = filtro.trim().toLowerCase()
  const visibles = texto
    ? permisos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(texto) ||
          (p.descripcion ?? '').toLowerCase().includes(texto),
      )
    : permisos

  // Agrupación por módulo conservando el orden de negocio.
  const modulos = [...new Set(visibles.map((p) => p.modulo ?? 'otros'))].sort(
    (a, b) => ordenModulo(a) - ordenModulo(b) || a.localeCompare(b),
  )

  const totalConcedidos = asignaciones.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles y permisos"
        subtitle="Qué puede hacer cada rol según roles_permisos · RF01 · RNF05 · CU-01"
      >
        <input
          type="search"
          className="input w-56"
          placeholder="Filtrar permiso…"
          aria-label="Filtrar permisos"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <button type="button" onClick={cargar} className="btn-ghost inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" /> Actualizar
        </button>
      </PageHeader>

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span>
          Vista de solo lectura. La matriz se carga con{' '}
          <code className="rounded bg-white px-1 py-0.5 text-xs">docs/seed_permisos_prueba.sql</code>{' '}
          y el backend la consulta en cada petición (<code className="rounded bg-white px-1 py-0.5 text-xs">requirePermiso</code>);
          lo que se ve aquí es el acceso realmente vigente.
        </span>
      </p>

      {/* Resumen por rol */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5 text-brand-600" />
              <p className="text-sm font-semibold text-slate-900">
                {ROL_LABEL[r.nombre] ?? r.nombre}
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {r.permisos_activos}
              <span className="text-sm font-medium text-slate-400"> / {permisos.length}</span>
            </p>
            <p className="text-xs text-slate-500">permisos concedidos</p>
            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <UsersIcon className="h-4 w-4 text-slate-400" />
              {r.usuarios} {r.usuarios === 1 ? 'cuenta' : 'cuentas'}
              <span className="text-slate-300">·</span>
              {r.usuarios_activos} activa{r.usuarios_activos === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>

      {/* Matriz */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Matriz rol → permiso</h3>
          <p className="text-xs text-slate-500">
            {permisos.length} permisos · {roles.length} roles · {totalConcedidos} asignaciones
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
                      <tr
                        key={p.id}
                        data-permiso={p.nombre}
                        className="transition hover:bg-slate-50/70"
                      >
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
                              {tiene ? (
                                <span title={etiqueta} aria-label={etiqueta}>
                                  <CheckIcon className="mx-auto h-4 w-4 text-emerald-600" />
                                </span>
                              ) : (
                                <span title={etiqueta} aria-label={etiqueta} className="text-slate-300">
                                  —
                                </span>
                              )}
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
    </div>
  )
}
