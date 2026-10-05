import { recurso } from './recurso'

/** Catálogos del personal (HU-04), indexados por tipo: `catalogosApi.cargos.listar()`. */
export const catalogosApi = {
  cargos: recurso('/catalogos/cargos'),
  especialidades: recurso('/catalogos/especialidades'),
}
