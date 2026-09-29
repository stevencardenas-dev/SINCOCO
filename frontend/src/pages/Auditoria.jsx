import { useCallback, useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  DocumentMagnifyingGlassIcon,
  FunnelIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import PageHeader from '../components/PageHeader.jsx'
import api from '../services/api'
import { fmtFechaHora } from '../lib/format.js'

/**
 * HU-17 (RF31 · RF32 · CU-17): consultar quién realizó cada operación crítica.
 *
 * Actor: administrador, y solo él: el endpoint exige el permiso
 * `auditoria.listar`, que únicamente tiene ADMINISTRADOR. La pantalla es de
 * consulta —la bitácora es inmutable— y filtra por usuario, tabla afectada y
 * rango de fechas, como pide el criterio 4.
 */

const ACCION_LABEL = {
  CREAR: 'Crear',
  ACTUALIZAR: 'Actualizar',
  DAR_DE_BAJA: 'Dar de baja',
  REACTIVAR: 'Reactivar',
  AUTENTICAR: 'Autenticar',
}

const ACCION_BADGE = {
  CREAR: 'bg-emerald-50 text-emerald-700',
  ACTUALIZAR: 'bg-sky-50 text-sky-700',
  DAR_DE_BAJA: 'bg-amber-50 text-amber-700',
  REACTIVAR: 'bg-emerald-50 text-emerald-700',
  AUTENTICAR: 'bg-slate-100 text-slate-600',
}

const ROL_LABEL = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  MAESTRO_OBRA: 'Maestro de obra',
  ENCARGADO_BODEGA: 'Encargado de bodega',
}

const SIN_FILTROS = { usuario: '', tabla: '', accion: '', desde: '', hasta: '' }

const TITULO_TABLA = {
  usuarios: 'Usuarios',
  trabajadores: 'Personal',
  proyectos: 'Proyectos',
  etapas_proyecto: 'Etapas del plan',
  actividades: 'Actividades del plan',
  clientes: 'Clientes',
}

/** El detalle llega como objeto (columna JSON) o como texto, según el driver. */
const textoDetalles = (detalles) => {
  if (!detalles) return '—'
  const texto = typeof detalles === 'string' ? detalles : JSON.stringify(detalles)
  return texto === '{}' ? '—' : texto
}

export default function Auditoria() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [filtros, setFiltros] = useState(SIN_FILTROS)
  const [pagina, setPagina] = useState(1)

  const cargar = useCallback(() => {
    setCargando(true)
    setError('')
    api
      .get('/auditoria', { params: { ...filtros, pagina } })
      .then((res) => setDatos(res.data))
      .catch((err) =>
        setError(err.response?.data?.error ?? 'No se pudo cargar la bitácora de trazabilidad.'),
      )
      .finally(() => setCargando(false))
  }, [filtros, pagina])

  useEffect(cargar, [cargar])

  // Cualquier cambio de filtro vuelve a la primera página: si no, una página
  // alta puede quedar vacía y parecer que no hay resultados.
  const cambiar = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }))
    setPagina(1)
  }

  const hayFiltros = Object.values(filtros).some(Boolean)
  const filas = datos?.filas ?? []
  const desde = datos && filas.length > 0 ? (datos.pagina - 1) * datos.limite + 1 : 0
  const hasta = datos && filas.length > 0 ? desde + filas.length - 1 : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trazabilidad y auditoría"
        subtitle="Quién realizó cada operación crítica y cuándo · RF31 · RF32 · HU-17"
      >
        <button type="button" onClick={cargar} className="btn-ghost inline-flex items-center gap-2">
          <ArrowPathIcon className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </PageHeader>

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span>
          Consulta de solo lectura: la bitácora es inmutable. Las filas las escribe el propio
          sistema (<code className="rounded bg-white px-1 py-0.5 text-xs">bitacora_trazabilidad</code>)
          en cada operación crítica; aquí no se pueden modificar ni borrar.
        </span>
      </p>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* Filtros: criterio 4 (usuario, tabla afectada y rango de fechas). */}
      <form className="card space-y-5 p-6" onSubmit={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2 text-slate-900">
          <FunnelIcon className="h-5 w-5 text-brand-600" />
          <h3 className="text-base font-semibold">Filtros</h3>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <label htmlFor="a-usuario" className="label">Usuario</label>
            <select
              id="a-usuario"
              className="input"
              value={filtros.usuario}
              onChange={(e) => cambiar('usuario', e.target.value)}
            >
              <option value="">Todos</option>
              {(datos?.filtros?.usuarios ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                  {u.activo ? '' : ' (inactivo)'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-tabla" className="label">Tabla afectada</label>
            <select
              id="a-tabla"
              className="input"
              value={filtros.tabla}
              onChange={(e) => cambiar('tabla', e.target.value)}
            >
              <option value="">Todas</option>
              {(datos?.filtros?.tablas ?? []).map((t) => (
                <option key={t} value={t}>
                  {TITULO_TABLA[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-accion" className="label">Acción</label>
            <select
              id="a-accion"
              className="input"
              value={filtros.accion}
              onChange={(e) => cambiar('accion', e.target.value)}
            >
              <option value="">Todas</option>
              {(datos?.filtros?.acciones ?? []).map((a) => (
                <option key={a} value={a}>
                  {ACCION_LABEL[a] ?? a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-desde" className="label">Desde</label>
            <input
              id="a-desde"
              type="date"
              className="input"
              value={filtros.desde}
              onChange={(e) => cambiar('desde', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="a-hasta" className="label">Hasta</label>
            <input
              id="a-hasta"
              type="date"
              className="input"
              value={filtros.hasta}
              onChange={(e) => cambiar('hasta', e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-ghost"
            disabled={!hayFiltros}
            onClick={() => {
              setFiltros(SIN_FILTROS)
              setPagina(1)
            }}
          >
            Limpiar filtros
          </button>
          <p className="text-xs text-slate-500">
            {datos
              ? `${datos.total} ${datos.total === 1 ? 'registro' : 'registros'} ` +
                (hayFiltros ? 'con los filtros aplicados' : 'en la bitácora')
              : 'Consultando…'}
          </p>
        </div>
      </form>

      {filas.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5 font-semibold">Fecha y hora</th>
                  <th className="px-5 py-3.5 font-semibold">Usuario</th>
                  <th className="px-5 py-3.5 font-semibold">Acción</th>
                  <th className="px-5 py-3.5 font-semibold">Tabla afectada</th>
                  <th className="px-5 py-3.5 font-semibold">Registro</th>
                  <th className="px-5 py-3.5 font-semibold">Detalles</th>
                  <th className="px-5 py-3.5 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((f) => {
                  const detalle = textoDetalles(f.detalles)
                  return (
                    <tr key={f.id} data-accion={f.accion} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {fmtFechaHora(f.fecha_registro)}
                      </td>
                      <td className="px-5 py-4">
                        {f.username ? (
                          <>
                            <p className="font-medium text-slate-800">{f.username}</p>
                            {f.rol && (
                              <p className="text-xs text-slate-400">{ROL_LABEL[f.rol] ?? f.rol}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">Usuario eliminado</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ACCION_BADGE[f.accion] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ACCION_LABEL[f.accion] ?? f.accion}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-600">{TITULO_TABLA[f.tabla_afectada] ?? f.tabla_afectada ?? '—'}</p>
                        {f.tabla_afectada && (
                          <p className="font-mono text-xs text-slate-400">{f.tabla_afectada}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {f.registro_id == null ? '—' : `#${f.registro_id}`}
                      </td>
                      <td className="max-w-[260px] px-5 py-4">
                        <p
                          className="truncate font-mono text-xs text-slate-500"
                          title={detalle}
                        >
                          {detalle}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">
                        {f.direccion_ip ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-500">
              Mostrando {desde}–{hasta} de {datos.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(p - 1, 1))}
              >
                Anterior
              </button>
              <span className="text-xs text-slate-500">
                Página {datos.pagina} de {datos.paginas}
              </span>
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={pagina >= datos.paginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CU-17 Alt (Sin coincidencias): el sistema indica que no hay resultados. */}
      {datos && filas.length === 0 && !error && (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <DocumentMagnifyingGlassIcon className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            No existen resultados para ese criterio
          </p>
          <p className="text-xs text-slate-500">
            {hayFiltros
              ? 'Ajusta o limpia los filtros para ver más operaciones.'
              : 'Todavía no se ha registrado ninguna operación en la bitácora.'}
          </p>
        </div>
      )}
    </div>
  )
}
