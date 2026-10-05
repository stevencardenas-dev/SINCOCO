import { useCallback, useEffect, useRef, useState } from 'react'
import { mensajeError } from '../lib/errores'

/**
 * Carga los datos de una página y maneja las acciones sobre ellos.
 *
 * Reemplaza el patrón que repetía cada página: `cargar()` con su loading y su
 * error, y los try/catch de «dar de baja», «reactivar», etc. que limpian los
 * mensajes, llaman al servicio, muestran un aviso y recargan.
 *
 * @param {() => Promise<any>} cargador  Trae los datos (p. ej. `() => trabajadoresApi.listar(filtros)`).
 * @param {any[]} deps  Cuando cambian, se vuelve a cargar (como en useEffect).
 * @param {object} [opciones]
 * @param {string} [opciones.mensaje]  Error de carga si la API no explica el motivo.
 * @param {boolean} [opciones.reiniciar]  Vaciar `datos` al cambiar las deps (cuando
 *   los datos anteriores no sirven para la vista nueva, como otra pestaña).
 *
 * Los errores de carga y los de las acciones se guardan por separado y `error`
 * muestra el que haya: así la recarga que sigue a una acción fallida no borra
 * su mensaje. Las respuestas que llegan tarde (filtros que cambiaron antes de
 * que respondiera la petición anterior) se descartan.
 */
export function useRecurso(cargador, deps, { mensaje = 'No se pudo cargar la información.', reiniciar = false } = {}) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [aviso, setAviso] = useState('')

  // El cargador y el mensaje se leen al momento de cargar: así `cargar` es
  // estable y siempre usa los filtros vigentes.
  const actual = useRef({ cargador, mensaje })
  actual.current = { cargador, mensaje }
  const ultimaPeticion = useRef(0)

  const cargar = useCallback(() => {
    const peticion = ++ultimaPeticion.current
    const vigente = () => peticion === ultimaPeticion.current
    setCargando(true)
    setErrorCarga('')
    return Promise.resolve()
      .then(() => actual.current.cargador())
      .then((d) => vigente() && setDatos(d))
      .catch((err) => vigente() && setErrorCarga(err?.response?.data?.error ?? actual.current.mensaje))
      .finally(() => vigente() && setCargando(false))
  }, [])

  // Las deps las da la página: son las que usa su cargador.
  useEffect(() => {
    if (reiniciar) setDatos(null)
    setErrorAccion('')
    cargar()
  }, deps)

  // Al desmontar, las respuestas pendientes quedan descartadas.
  useEffect(() => () => void ultimaPeticion.current++, [])

  /** Recarga manual (botón «Actualizar», después de guardar un formulario). */
  const recargar = useCallback(() => {
    setErrorAccion('')
    return cargar()
  }, [cargar])

  const limpiarMensajes = useCallback(() => {
    setErrorAccion('')
    setAviso('')
  }, [])

  /**
   * Ejecuta una acción de la página: limpia los mensajes, llama a `accion` y
   * muestra `exito` (texto o función del resultado) o el error de la API con
   * `error` de respaldo. Por defecto recarga los datos al terminar bien;
   * `recargarSiFalla` también lo hace si falla (para deshacer lo que la vista
   * ya mostró). Devuelve true si la acción se completó.
   */
  const ejecutar = useCallback(
    async (accion, { exito, error, recargar: conRecarga = true, recargarSiFalla = false } = {}) => {
      setErrorAccion('')
      setAviso('')
      try {
        const resultado = await accion()
        if (exito) setAviso(typeof exito === 'function' ? exito(resultado) : exito)
        if (conRecarga) await cargar()
        return true
      } catch (err) {
        setErrorAccion(mensajeError(err, error))
        if (recargarSiFalla) await cargar()
        return false
      }
    },
    [cargar],
  )

  return {
    datos,
    setDatos,
    cargando,
    error: errorCarga || errorAccion,
    errorCarga,
    setError: setErrorAccion,
    aviso,
    setAviso,
    limpiarMensajes,
    recargar,
    ejecutar,
  }
}
