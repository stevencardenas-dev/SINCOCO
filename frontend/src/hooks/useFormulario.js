import { useRef, useState } from 'react'
import { campoError, mensajeError } from '../lib/errores'

/**
 * Estado de un formulario o de una confirmación: los valores, si está abierto,
 * el registro que se edita, el error de negocio con su campo y el «Guardando…».
 *
 * Reemplaza el grupo de useState que repetía cada modal (form, abierto,
 * editando, errorForm, campoForm, guardando) y el try/catch de su `guardar`.
 *
 * @param {object} inicial  Valores del formulario vacío.
 * @param {object} opciones
 * @param {(valores, registro) => Promise<any>} opciones.enviar  Llama a la API.
 * @param {(resultado, { valores, registro }) => any} [opciones.alGuardar]  Después
 *   de guardar bien (aviso, recarga…). Recibe los valores y el registro que tenía
 *   el formulario, porque para entonces ya se cerró.
 * @param {(valores, registro) => string | { error, campo } | null} [opciones.validar]
 *   Validación previa en el navegador; si devuelve algo, no se envía.
 * @param {string} [opciones.error]  Mensaje si la API no explica el fallo.
 * @param {boolean} [opciones.cerrarAlGuardar]  Cerrar y vaciar al guardar (por defecto sí).
 *
 * `registro` es aquello sobre lo que trabaja el formulario: la fila que se
 * edita o se va a dar de baja, o null cuando registra algo nuevo.
 */
export function useFormulario(inicial, { enviar, alGuardar, validar, error: respaldo, cerrarAlGuardar = true }) {
  const [valores, setValores] = useState(inicial)
  const [abierto, setAbierto] = useState(false)
  const [registro, setRegistro] = useState(null)
  const [error, setMensaje] = useState('')
  const [campo, setCampo] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Las opciones se leen al usarlas: así `cerrar` vacía con el `inicial` vigente
  // (p. ej. el de la pestaña actual) y `enviar` ve el estado más reciente.
  const opciones = useRef()
  opciones.current = { inicial, enviar, alGuardar, validar, respaldo, cerrarAlGuardar }

  /** Muestra un error en el formulario (y resalta `campo`, si se indica). */
  const setError = (mensaje, nombreCampo = null) => {
    setMensaje(mensaje)
    setCampo(nombreCampo)
  }

  /** Abre con estos valores; `registro` es lo que se edita (null = nuevo). */
  const abrir = (vals = opciones.current.inicial, reg = null) => {
    setValores(vals)
    setRegistro(reg)
    setError('')
    setAbierto(true)
  }

  const cerrar = () => {
    setAbierto(false)
    setRegistro(null)
    setValores(opciones.current.inicial)
    setError('')
  }

  /** Cambia un campo: `cambiar('nombre', valor)`. */
  const cambiar = (nombre, valor) => setValores((v) => ({ ...v, [nombre]: valor }))

  /** Manejador de `onSubmit` (o de un botón «Confirmar»). */
  const guardar = async (e) => {
    e?.preventDefault?.()
    const { enviar, alGuardar, validar, respaldo, cerrarAlGuardar } = opciones.current
    setError('')
    const invalido = validar?.(valores, registro)
    if (invalido) {
      if (typeof invalido === 'string') setError(invalido)
      else setError(invalido.error, invalido.campo)
      return
    }
    setGuardando(true)
    try {
      const resultado = await enviar(valores, registro)
      const contexto = { valores, registro }
      if (cerrarAlGuardar) cerrar()
      await alGuardar?.(resultado, contexto)
    } catch (err) {
      setError(mensajeError(err, respaldo), campoError(err))
    } finally {
      setGuardando(false)
    }
  }

  /** Clase del input: resaltada si el error de la API señala ese campo. */
  const claseCampo = (nombre, base = 'input') => (campo === nombre ? `${base} border-red-400` : base)

  return {
    valores,
    setValores,
    cambiar,
    abierto,
    registro,
    abrir,
    cerrar,
    guardar,
    guardando,
    error,
    campo,
    setError,
    claseCampo,
    /** Props listas para <ModalFormulario {...f.propsModal}>. */
    propsModal: { abierto, onCerrar: cerrar, onGuardar: guardar, guardando, error, campoError: campo },
  }
}
