/**
 * Validación de formularios, igual para todos.
 *
 * Los navegadores muestran un globo propio y en el idioma del sistema («Rellene este campo», «Seleccione un
 * elemento de la lista»), distinto en cada navegador y sin decir qué campo falta. Aquí se cancela ese globo y se
 * muestra, dentro del formulario, un aviso en español que nombra los campos: «Seleccione «Proyecto»…».
 *
 * Se instala una sola vez (main.jsx) y alcanza a todos los formularios con campos `required`, `min`, `max`,
 * `type="email"`, etc., sin tocar cada pantalla. Los campos con error se marcan con `aria-invalid` y el primero
 * recibe el foco; la marca y el aviso desaparecen en cuanto el usuario corrige o el formulario se envía bien.
 */

const ICONO = '<svg class="mt-0.5 h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>'

/** Etiqueta visible del campo, sin aclaraciones entre paréntesis como «(opcional)». */
function etiqueta(el) {
  const texto = el.labels?.[0]?.textContent
    || el.getAttribute('aria-label')
    || el.getAttribute('placeholder')
    || el.name
    || el.id
    || 'este campo'
  return texto.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim()
}

const esLista = (el) => el.tagName === 'SELECT' || el.getAttribute('role') === 'combobox'
// Un campo de lista sin selección se marca con un error propio (ver BuscadorSelect): cuenta como «falta».
const faltaValor = (el) => el.validity.valueMissing || (esLista(el) && el.validity.customError)

/** Mensaje de un solo campo inválido. */
function mensajeCampo(el) {
  const nombre = `«${etiqueta(el)}»`
  if (faltaValor(el)) {
    if (el.type === 'checkbox') return `Marque ${nombre} para continuar.`
    return esLista(el) ? `Seleccione ${nombre}.` : `Complete el campo ${nombre}.`
  }
  return `${nombre}: ${el.validationMessage}`
}

export function mensajeFormulario(invalidos) {
  if (invalidos.length === 1) return mensajeCampo(invalidos[0])
  const faltantes = invalidos.filter(faltaValor)
  if (faltantes.length === invalidos.length) {
    return `Faltan campos obligatorios: ${faltantes.map((el) => `«${etiqueta(el)}»`).join(', ')}.`
  }
  return mensajeCampo(invalidos[0])
}

function quitarAviso(form) {
  form.querySelector('[data-validacion]')?.remove()
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'))
}

function mostrarAviso(form, invalidos) {
  quitarAviso(form)
  invalidos.forEach((el) => el.setAttribute('aria-invalid', 'true'))
  const aviso = document.createElement('p')
  aviso.setAttribute('role', 'alert')
  aviso.setAttribute('data-validacion', '')
  aviso.className = 'flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700'
  aviso.innerHTML = `${ICONO}<span></span>`
  aviso.lastChild.textContent = mensajeFormulario(invalidos)
  // Va antes del pie con los botones (o del botón de envío), para verlo junto a quien se acaba de pulsar.
  const enviar = form.querySelector('button[type="submit"]')
  const destino = enviar && enviar.parentElement !== form ? enviar.parentElement : enviar
  if (destino && destino.parentNode) destino.parentNode.insertBefore(aviso, destino)
  else form.appendChild(aviso)
  invalidos[0].focus({ preventScroll: false })
  invalidos[0].scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

export function instalarValidacionFormularios() {
  if (typeof document === 'undefined' || document.documentElement.dataset.validacionFormularios) return
  document.documentElement.dataset.validacionFormularios = 'true'

  const pendientes = new Set()
  // El navegador dispara «invalid» por cada campo; se agrupan por formulario y se muestra un solo aviso.
  document.addEventListener('invalid', (e) => {
    const form = e.target.form
    if (!form) return
    e.preventDefault() // sin el globo nativo
    if (pendientes.has(form)) return
    pendientes.add(form)
    queueMicrotask(() => {
      pendientes.delete(form)
      const invalidos = Array.from(form.elements).filter((el) => el.willValidate && !el.validity.valid && el.type !== 'hidden')
      if (invalidos.length) mostrarAviso(form, invalidos)
    })
  }, true)

  const limpiar = (e) => {
    const form = e.target.form ?? e.target.closest?.('form')
    if (!form) return
    e.target.removeAttribute?.('aria-invalid')
    // si ya no queda ningún campo marcado, se quita el aviso
    if (!form.querySelector('[aria-invalid="true"]')) form.querySelector('[data-validacion]')?.remove()
  }
  document.addEventListener('input', limpiar, true)
  document.addEventListener('change', limpiar, true)
  document.addEventListener('submit', (e) => { if (e.target.checkValidity?.()) quitarAviso(e.target) }, true)
}
