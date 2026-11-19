import api from './api'
import { datos } from './recurso'

/** HU-22 · evidencias de avance de una actividad. */
export const evidenciasApi = {
  deActividad: (actividadId) => datos(api.get('/evidencias', { params: { actividad_id: actividadId } })),
  recientes: (limite = 6) => datos(api.get('/evidencias', { params: { recientes: limite } })),
  subir: (cuerpo) => datos(api.post('/evidencias', cuerpo)),
  eliminar: (id) => datos(api.delete(`/evidencias/${id}`)),
  urlArchivo: (id) => `/api/evidencias/${id}/archivo`,
}

/** Lee un archivo del navegador y lo devuelve en base64 (sin el prefijo data:). */
export function archivoABase64(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '')
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'))
    lector.readAsDataURL(archivo)
  })
}
