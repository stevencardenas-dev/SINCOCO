import api from './api'
import { datos, sinVacios } from './recurso'

export const alertasApi = {
  listar: (filtros) => datos(api.get('/alertas', { params: sinVacios(filtros) })),
  atender: (id) => datos(api.patch(`/alertas/${id}/atender`)),
  // HU-24: evalúa actividades atrasadas y herramientas sin devolver, y recuerda
  // al responsable por correo desde la alerta.
  evaluar: () => datos(api.post('/alertas/evaluar')),
  recordar: (id) => datos(api.post(`/alertas/${id}/recordatorio`)),
}
