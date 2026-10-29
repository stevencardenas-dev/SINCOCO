import api from './api'
import { datos, sinVacios } from './recurso'

const ruta = '/solicitudes-materiales'

export const solicitudesMaterialesApi = {
  listar: (filtros) => datos(api.get(ruta, { params: sinVacios(filtros) })),
  // Materiales que se pueden pedir; no requiere el permiso del catálogo de inventario.
  catalogo: () => datos(api.get(`${ruta}/materiales`)),
  crear: (cuerpo) => datos(api.post(ruta, cuerpo)),
  aprobar: (id, cuerpo) => datos(api.patch(`${ruta}/${id}/aprobar`, cuerpo)),
  rechazar: (id, observaciones) => datos(api.patch(`${ruta}/${id}/rechazar`, { observaciones })),
  despachar: (id, cuerpo) => datos(api.patch(`${ruta}/${id}/despachar`, cuerpo)),
  cancelar: (id) => datos(api.patch(`${ruta}/${id}/cancelar`)),
  // HU-36: cancela el saldo pendiente (observación obligatoria); la solicitud se cierra con lo despachado.
  cancelarSaldo: (id, observaciones) => datos(api.patch(`${ruta}/${id}/cancelar-saldo`, { observaciones })),
}
