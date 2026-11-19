import api from './api'
import { datos, sinVacios } from './recurso'

/** HU-25 · reportes filtrados y su exportación. */
export const reportesApi = {
  generar: (filtros) => datos(api.get('/reportes', { params: sinVacios(filtros) })),
  proyectos: () => datos(api.get('/reportes/proyectos')),
  /** Devuelve el archivo como blob junto con su nombre. */
  exportar: async (filtros, formato) => {
    const res = await api.get('/reportes/exportar', {
      params: sinVacios({ ...filtros, formato }),
      responseType: 'blob',
    })
    const disposicion = res.headers?.['content-disposition'] ?? ''
    const nombre = /filename="([^"]+)"/.exec(disposicion)?.[1] ?? `reporte.${formato}`
    return { blob: res.data, nombre }
  },
}

/** Descarga un blob con el nombre indicado. */
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
