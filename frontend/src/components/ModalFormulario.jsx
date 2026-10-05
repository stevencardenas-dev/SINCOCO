import Modal from './Modal.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'

/**
 * Ventana con formulario: el esqueleto que repetían todos los módulos.
 *
 * Pone la ventana (`Modal`), la etiqueta `<form>`, la alerta de error DENTRO del
 * formulario y el pie con «Guardar» / «Cancelar». Cada pantalla solo aporta los
 * campos (children) y su lógica (`onGuardar`, `onCerrar`), sin conocer cómo se
 * pinta el pie ni el estado «Guardando…».
 *
 *  - `error` / `campoError`: mensaje de negocio y campo a resaltar.
 *  - `textoGuardar`: etiqueta del botón principal («Crear usuario»…).
 *  - `acciones`: botones extra en el pie, a continuación de «Cancelar».
 */
export default function ModalFormulario({
  abierto,
  titulo,
  subtitulo,
  ancho,
  onGuardar,
  onCerrar,
  guardando = false,
  error = '',
  campoError = null,
  textoGuardar = 'Guardar',
  textoGuardando = 'Guardando…',
  acciones,
  espaciado = 'space-y-5',
  children,
}) {
  return (
    <Modal abierto={abierto} titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} ancho={ancho}>
      <form onSubmit={onGuardar} className={espaciado}>
        {children}

        {/* El error de negocio se muestra aquí, dentro del formulario. */}
        <AlertaFormulario mensaje={error} campo={campoError} />

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button type="submit" disabled={guardando} className="btn-primary disabled:opacity-60">
            {guardando ? textoGuardando : textoGuardar}
          </button>
          <button type="button" className="btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          {acciones}
        </div>
      </form>
    </Modal>
  )
}
