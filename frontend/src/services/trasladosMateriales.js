import api from './api'
import { datos } from './recurso'

const ruta = '/traslados-materiales'

export const trasladosMaterialesApi = {
  listar: () => datos(api.get(ruta)),
  // Opciones del formulario (almacenes y materiales): no requieren los permisos de esos módulos.
  opciones: () => datos(api.get(`${ruta}/opciones`)),
  registrar: (cuerpo) => datos(api.post(ruta, cuerpo)),
}
