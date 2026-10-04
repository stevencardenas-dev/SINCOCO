/**
 * Fila para cuando una tabla no tiene datos que mostrar.
 *
 * Una tabla vacía sin mensaje parece rota: pasa al buscar algo que no existe,
 * al filtrar por un estado sin registros o cuando el módulo todavía está en
 * blanco. Esta fila ocupa todas las columnas y explica qué está pasando.
 *
 * Uso: `{filas.length === 0 && <FilaVacia columnas={7}>No hay …</FilaVacia>}`
 */
export default function FilaVacia({ columnas, children }) {
  return (
    <tr>
      <td
        colSpan={columnas}
        className="px-5 py-10 text-center text-sm text-slate-400"
      >
        {children}
      </td>
    </tr>
  )
}
