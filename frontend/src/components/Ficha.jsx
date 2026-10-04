import { EyeIcon } from '@heroicons/react/24/outline'
import Modal from './Modal.jsx'

/**
 * Celda «Ver ficha» de las tablas: solo se muestra en el celular, donde la
 * tabla conserva unas pocas columnas y el resto del detalle va en la ficha.
 */
export function CeldaFicha({ onClick, etiqueta }) {
  return (
    <td className="px-3 py-3 text-right md:hidden">
      <button
        type="button"
        className="btn-accion btn-accion-editar"
        onClick={onClick}
        aria-label={etiqueta ? `Ver ficha de ${etiqueta}` : 'Ver ficha'}
      >
        <EyeIcon className="h-4 w-4" /> Ver ficha
      </button>
    </td>
  )
}

/** Encabezado de la columna «Ver ficha» (solo celular). */
export const EncabezadoFicha = () => (
  <th className="px-3 py-3 text-right font-semibold md:hidden">Ver ficha</th>
)

/**
 * Ficha de un registro: todos sus datos en una ventana, más las acciones
 * (`children`) que en escritorio viven en la tabla.
 * `campos`: [[etiqueta, valor], …]; los valores vacíos se muestran como «—».
 */
export default function Ficha({ abierto, titulo, subtitulo, onCerrar, campos = [], children }) {
  return (
    <Modal abierto={abierto} titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} ancho="max-w-md">
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
      {children && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">{children}</div>
      )}
    </Modal>
  )
}
