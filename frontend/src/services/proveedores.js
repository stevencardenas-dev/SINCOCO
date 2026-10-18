import api from './api'
import { datos, recurso } from './recurso'

export const proveedoresApi = {
  ...recurso('/proveedores'),
  // Documentos de soporte (HU-13 criterio 3): el archivo viaja como cuerpo
  // crudo con su propio Content-Type (PDF, PNG o JPG).
  documentos: (id) => datos(api.get(`/proveedores/${id}/documentos`)),
  adjuntar: (id, { tipo, archivo }) =>
    datos(
      api.post(`/proveedores/${id}/documentos`, archivo, {
        params: { tipo, nombre: archivo.name },
        headers: { 'Content-Type': archivo.type },
      }),
    ),
  descargar: (id, docId) =>
    api.get(`/proveedores/${id}/documentos/${docId}`, { responseType: 'blob' }).then((res) => res.data),
  eliminarDocumento: (id, docId) => datos(api.delete(`/proveedores/${id}/documentos/${docId}`)),
}
