import api from './api'
import { datos } from './recurso'

export const plantillasEtapasApi = {
  listar: () => datos(api.get('/plantillas-etapas')),
  /** Crea las etapas de la plantilla; `confirmar` autoriza agregarlas a un plan que ya tiene etapas. */
  aplicar: (cuerpo) => datos(api.post('/plantillas-etapas/aplicar', cuerpo)),
}
