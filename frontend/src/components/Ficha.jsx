import { Fragment, useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon, EyeIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'
import { alternarOrden, comparar } from '../lib/ordenarTabla.js'

/**
 * Ficha de un registro (ventana): los datos de las columnas que el celular
 * oculta y, aparte, sus acciones.
 * `campos`: [[etiqueta, valor], …]; los valores vacíos se muestran como «—».
 * `acciones`: botones/enlaces; cualquier clic en uno de ellos cierra la ficha.
 */
export default function Ficha({ titulo, subtitulo, onCerrar, campos = [], acciones }) {
  return (
    <Modal abierto titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} ancho="max-w-md">
      <dl className="divide-y divide-slate-100">
        {campos.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="grid grid-cols-3 gap-3 py-2.5 text-sm">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{etiqueta}</dt>
            <dd className="col-span-2 break-words text-slate-800">
              {valor === null || valor === undefined || valor === '' ? '—' : valor}
            </dd>
          </div>
        ))}
      </dl>
      {acciones && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Acciones</p>
          <div
            className="grid grid-cols-2 gap-2 [&>*]:w-full [&>*]:justify-center [&>*:only-child]:col-span-2"
            onClick={(e) => {
              if (e.target.closest('button, a')) onCerrar()
            }}
          >
            {acciones}
          </div>
        </div>
      )}
    </Modal>
  )
}

const vacio = (v) => v === null || v === undefined || v === false || v === ''

/** Texto visible de lo que devuelve `celda` (cadenas, números y elementos con hijos). */
function textoDe(nodo) {
  if (vacio(nodo) || nodo === true) return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(textoDe).join(' ')
  return textoDe(nodo.props?.children)
}

const MONTO = /^\$?\s?-?\d{1,3}(\.\d{3})*(,\d+)?$/

/** Valor por el que se ordena una columna: número si parece un monto/cantidad, si no texto. */
function claveOrden(columna, fila) {
  if (columna.orden) return columna.orden(fila)
  let texto = textoDe(columna.celda(fila, false)).replace(/\s+/g, ' ').trim()
  if (!texto && columna.valor) texto = textoDe(columna.valor(fila)).trim()
  if (MONTO.test(texto)) return Number(texto.replace(/[$\s.]/g, '').replace(',', '.'))
  return texto === '—' ? '' : texto
}

/**
 * Tabla responsive dirigida por columnas.
 *
 * Cada columna: { titulo, celda(fila, enFicha), movil?, acciones?, derecha?, tdClase?, thClase?, valor?(fila) }
 *  - `movil`: la columna se ve también en el celular.
 *  - `acciones`: la columna son botones; en escritorio van en su celda y en el
 *    celular pasan al bloque «Acciones» de la ficha.
 *  - el resto de columnas se ocultan en el celular y la ficha las muestra como
 *    campos; `valor(fila)` permite mostrar en la ficha algo distinto (p. ej. el
 *    texto completo de una celda truncada).
 *
 * `ficha`: { titulo(fila), subtitulo?(fila), etiqueta?(fila), extras?(fila) }
 * donde `extras` añade campos que no tienen columna propia.
 * El botón «Ver ficha» solo aparece en el celular.
 *
 * Todas las columnas (menos las de `acciones`) se ordenan de menor a mayor y
 * viceversa al pulsar su encabezado. La clave se toma del texto de la celda;
 * `orden(fila)` la reemplaza cuando ese texto no ordena bien (fechas, estados).
 *
 * `alinearArriba`: las celdas se alinean al primer renglón (align-top) en vez
 * de al centro. Sirve cuando hay celdas de varias líneas: así el texto, los
 * selectores y los botones de la fila quedan a la misma altura. Los controles
 * más altos que una línea de texto llevan `-my-1` para centrarse en ese renglón.
 */
export function TablaFicha({
  filas,
  columnas,
  getId = (f) => f.id,
  minWidth = 'md:min-w-[760px]',
  theadClase = 'bg-slate-50 text-xs uppercase tracking-wide text-slate-500',
  filaClase,
  filaProps,
  vacia,
  ficha,
  alinearArriba = false,
}) {
  const [fichaId, setFichaId] = useState(null)
  const [orden, setOrden] = useState(null) // { titulo, desc }
  const actual = fichaId === null ? null : (filas.find((f) => getId(f) === fichaId) ?? null)

  const filasOrdenadas = useMemo(() => {
    const col = orden && columnas.find((c) => c.titulo === orden.titulo && !c.acciones)
    if (!col) return filas
    const claves = new Map(filas.map((f) => [f, claveOrden(col, f)]))
    const signo = orden.desc ? -1 : 1
    return [...filas].sort((x, y) => signo * comparar(claves.get(x), claves.get(y)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, orden])

  // Ciclo: ascendente → descendente → sin orden.
  const alternar = (titulo) => setOrden((o) => alternarOrden(o, titulo))

  const ocultas = columnas.filter((c) => !c.movil && !c.acciones)
  const accionesCols = columnas.filter((c) => c.acciones)

  const campos = actual
    ? [
        ...ocultas.map((c) => [c.titulo, c.valor ? c.valor(actual) : c.celda(actual)]),
        ...(ficha.extras?.(actual) ?? []),
      ]
    : []
  const botones = actual
    ? accionesCols.map((c) => c.celda(actual, true)).filter((n) => !vacio(n))
    : []

  return (
    <>
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${minWidth}`}>
          <thead>
            <tr className={`border-b border-slate-200 ${theadClase}`}>
              {columnas.map((c) => (
                <th
                  key={c.titulo}
                  aria-sort={orden?.titulo === c.titulo ? (orden.desc ? 'descending' : 'ascending') : undefined}
                  className={`font-semibold ${c.derecha ? 'text-right' : ''} ${
                    c.movil ? 'px-3 py-3 md:px-5 md:py-3.5' : 'hidden px-5 py-3.5 md:table-cell'
                  } ${c.thClase ?? ''}`}
                >
                  {c.acciones ? (
                    c.titulo
                  ) : (
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-brand-800 ${
                        c.derecha ? 'flex-row-reverse' : ''
                      }`}
                      onClick={() => alternar(c.titulo)}
                      aria-label={`Ordenar por ${c.titulo}`}
                    >
                      {c.titulo}
                      {orden?.titulo !== c.titulo ? (
                        <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-40" />
                      ) : orden.desc ? (
                        <ChevronDownIcon className="h-3.5 w-3.5 text-brand-700" />
                      ) : (
                        <ChevronUpIcon className="h-3.5 w-3.5 text-brand-700" />
                      )}
                    </button>
                  )}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-semibold md:hidden">Ver ficha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.length === 0 && vacia}
            {filasOrdenadas.map((f) => (
              <tr
                key={getId(f)}
                className={`${alinearArriba ? 'align-top' : ''} ${filaClase?.(f) ?? ''}`}
                {...(filaProps?.(f) ?? {})}
              >
                {columnas.map((c) => (
                  <td
                    key={c.titulo}
                    className={`${c.derecha ? 'text-right' : ''} ${c.tdClase ?? ''} ${
                      c.movil ? 'px-3 py-3 md:px-5 md:py-4' : 'hidden px-5 py-4 md:table-cell'
                    }`}
                  >
                    {c.celda(f, false)}
                  </td>
                ))}
                <td className="px-3 py-3 text-right md:hidden">
                  <button
                    type="button"
                    className={`btn-accion btn-accion-editar ${alinearArriba ? '-my-1' : ''}`}
                    onClick={() => setFichaId(getId(f))}
                    aria-label={`Ver ficha de ${ficha.etiqueta?.(f) ?? ficha.titulo(f)}`}
                  >
                    <EyeIcon className="h-4 w-4" /> Ver ficha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {actual && (
        <Ficha
          titulo={ficha.titulo(actual)}
          subtitulo={ficha.subtitulo?.(actual)}
          onCerrar={() => setFichaId(null)}
          campos={campos}
          acciones={botones.length > 0 ? botones.map((b, i) => <Fragment key={i}>{b}</Fragment>) : null}
        />
      )}
    </>
  )
}
