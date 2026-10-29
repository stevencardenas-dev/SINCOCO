import api from './api'
import { datos } from './recurso'

const ruta = '/devoluciones-materiales'

export const devolucionesMaterialesApi = {
  listar: () => datos(api.get(ruta)),
  // Opciones del formulario (proyectos, trabajadores, almacenes y materiales): no requieren los permisos de esos módulos.
  opciones: () => datos(api.get(`${ruta}/opciones`)),
  actividades: (proyectoId) => datos(api.get(`${ruta}/actividades`, { params: { proyecto_id: proyectoId } })),
  salidas: (proyectoId) => datos(api.get(`${ruta}/salidas`, { params: { proyecto_id: proyectoId } })),
  registrar: (cuerpo) => datos(api.post(ruta, cuerpo)),
}
