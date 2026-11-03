/** Pie de paginación de un listado (ver `usePaginacion`). No se muestra si no hay filas. */
export default function Paginacion({ paginacion }) {
  const { pagina, paginas, total, desde, hasta, setPagina } = paginacion
  if (total === 0) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
      <p className="text-xs text-slate-500">Mostrando {desde}–{hasta} de {total}</p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost text-xs" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
          Anterior
        </button>
        <span className="text-xs text-slate-500">Página {pagina} de {paginas}</span>
        <button type="button" className="btn-ghost text-xs" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  )
}
