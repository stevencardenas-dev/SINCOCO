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
 *  - `deshabilitado`: bloquea «Guardar» sin mostrar «Guardando…» (p. ej. falta una confirmación).
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
  deshabilitado = false,
  error = '',
  campoError = null,
  textoGuardar = 'Guardar',
  textoGuardando = 'Guardando…',
  acciones,
  espaciado = 'space-y-5',
  children,
}) {
  return (
    <Modal abierto={abierto} titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} ancho={ancho} lateral>
      <form
        onSubmit={onGuardar}
        className={espaciado}
        // Ctrl/Cmd + Enter envía desde cualquier campo (igual que «Aplicar» en los filtros).
        // requestSubmit respeta la validación nativa de los campos requeridos.
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.repeat) {
            e.preventDefault()
            if (!guardando && !deshabilitado) e.currentTarget.requestSubmit()
          }
        }}
      >
        {children}

        {/* El error de negocio se muestra aquí, dentro del formulario. */}
        <AlertaFormulario mensaje={error} campo={campoError} />

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={guardando || deshabilitado}
            className="btn-primary disabled:opacity-60"
            aria-keyshortcuts="Control+Enter"
            title={`${textoGuardar} (Ctrl + Enter)`}
          >
            {guardando ? textoGuardando : textoGuardar}
            <kbd className="hidden rounded bg-brand-950/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold whitespace-nowrap sm:inline">Ctrl ↵</kbd>
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
