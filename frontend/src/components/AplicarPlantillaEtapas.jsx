import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import AlertaFormulario from './AlertaFormulario.jsx'
import { plantillasEtapasApi } from '../services/plantillasEtapas'
import { mensajeError } from '../lib/errores.js'

/**
 * Mejora de HU-03: aplica una plantilla de etapas a un proyecto. Las etapas
 * nacen pendientes, sin fechas ni peso. Si el proyecto ya tiene etapas, el
 * servidor pide confirmación y las nuevas se agregan al final.
 */
export default function AplicarPlantillaEtapas({ abierto, proyectoId, onCerrar, onAplicada }) {
  const [plantillas, setPlantillas] = useState([])
  const [seleccion, setSeleccion] = useState('')
  const [existentes, setExistentes] = useState(0) // > 0: falta confirmar
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setSeleccion('')
    setExistentes(0)
    setError('')
    plantillasEtapasApi.listar().then(setPlantillas).catch((e) => setError(mensajeError(e, 'No se pudieron cargar las plantillas.')))
  }, [abierto])

  const plantilla = plantillas.find((p) => String(p.id) === String(seleccion))

  const aplicar = async () => {
    setEnviando(true)
    setError('')
    try {
      const r = await plantillasEtapasApi.aplicar({
        proyecto_id: Number(proyectoId), plantilla_id: Number(seleccion), confirmar: existentes > 0,
      })
      onAplicada(r)
    } catch (e) {
      if (e.response?.status === 409 && e.response.data?.codigo === 'CONFIRMAR_PLANTILLA') {
        setExistentes(e.response.data.etapas_existentes)
      } else {
        setError(mensajeError(e, 'No se pudo aplicar la plantilla.'))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal abierto={abierto} titulo="Aplicar plantilla de etapas" onCerrar={onCerrar}
      subtitulo="Crea las etapas con su nombre y orden, sin fechas ni peso.">
      <div className="space-y-4">
        {error && <AlertaFormulario mensaje={error} />}
        <div>
          <label htmlFor="pl-tipo" className="label">Tipo de proyecto</label>
          <select id="pl-tipo" className="input" value={seleccion}
            onChange={(e) => { setSeleccion(e.target.value); setExistentes(0) }}>
            <option value="">Seleccione una plantilla</option>
            {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        {plantilla && (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {plantilla.etapas.map((e) => <li key={e.orden}>{e.nombre}</li>)}
          </ol>
        )}
        {existentes > 0 && (
          <AlertaFormulario tipo="aviso"
            mensaje={`Este proyecto ya tiene ${existentes} etapa(s). Si continúa, las de la plantilla se agregan al final; no se modifica ni se duplica ninguna existente (las de igual nombre se omiten).`} />
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCerrar}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={!seleccion || enviando} onClick={aplicar}>
            {existentes > 0 ? 'Confirmar y agregar al final' : 'Aplicar plantilla'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
