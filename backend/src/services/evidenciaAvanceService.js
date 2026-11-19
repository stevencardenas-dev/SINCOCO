import * as repo from '../repositories/evidenciaAvanceRepository.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-22 · evidencias de avance.
 *
 * Cada corte de avance puede llevar evidencias (fotos de la obra o documentos).
 * Se aceptan JPG, PNG, WEBP y PDF hasta 3 MB; el formato se decide por el tipo
 * MIME declarado y, si no viene, por la extensión del archivo. El contenido
 * viaja en base64 desde la pantalla y se guarda comprimido en la tabla, por eso
 * el tamaño se valida antes de tocar la base.
 */

export const TIPOS_PERMITIDOS = {
  'image/jpeg': { extension: 'jpg', etiqueta: 'JPG' },
  'image/jpg': { extension: 'jpg', etiqueta: 'JPG' },
  'image/png': { extension: 'png', etiqueta: 'PNG' },
  'image/webp': { extension: 'webp', etiqueta: 'WEBP' },
  'application/pdf': { extension: 'pdf', etiqueta: 'PDF' },
}

export const PESO_MAXIMO = 3 * 1024 * 1024

const POR_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
}

export const FORMATOS_TEXTO = 'JPG, PNG, WEBP o PDF'

/** Normaliza el tipo de archivo declarado; null si no está permitido. */
export function tipoPermitido(nombreArchivo, tipoDeclarado) {
  const tipo = String(tipoDeclarado ?? '').toLowerCase().split(';')[0].trim()
  if (TIPOS_PERMITIDOS[tipo]) return tipo === 'image/jpg' ? 'image/jpeg' : tipo
  const ext = String(nombreArchivo ?? '').split('.').pop()?.toLowerCase() ?? ''
  return POR_EXTENSION[ext] ?? null
}

const CATEGORIAS = ['FOTO', 'PLANO', 'ACTA', 'OTRO']

/**
 * Adjunta una evidencia al último corte de avance de la actividad.
 * @param {string} contenidoBase64 archivo en base64 (sin o con prefijo data:)
 */
export async function subirEvidencia(actividadId, body = {}, ctx = {}) {
  const id = Number(actividadId)
  if (!id) throw new AppError('Actividad no válida', 400, 'actividad_id')

  const nombre = String(body.nombre_archivo ?? '').trim()
  if (!nombre) throw new AppError('Indique el nombre del archivo', 400, 'nombre_archivo')

  const tipo = tipoPermitido(nombre, body.tipo_archivo)
  if (!tipo) {
    throw new AppError(`Solo se aceptan evidencias en ${FORMATOS_TEXTO}`, 400, 'tipo_archivo')
  }

  const crudo = String(body.contenido ?? '').replace(/^data:[^;]+;base64,/, '')
  if (!crudo || !/^[A-Za-z0-9+/=\r\n]+$/.test(crudo)) {
    throw new AppError('El archivo llegó vacío o dañado', 400, 'contenido')
  }
  const tamano = Buffer.from(crudo, 'base64').length
  if (tamano > PESO_MAXIMO) {
    throw new AppError(
      `El archivo supera el máximo de ${PESO_MAXIMO / (1024 * 1024)} MB`,
      400,
      'contenido',
    )
  }

  const seguimiento = await repo.ultimoSeguimiento(id)
  if (!seguimiento) {
    throw new AppError('La actividad todavía no tiene cortes de avance donde adjuntar la evidencia', 400, 'actividad_id')
  }

  const categoria = CATEGORIAS.includes(String(body.categoria ?? '').toUpperCase())
    ? String(body.categoria).toUpperCase()
    : 'FOTO'

  const evidenciaId = await repo.crear({
    seguimiento_id: seguimiento.id,
    nombre_archivo: nombre,
    ruta_archivo: '',
    tipo_archivo: tipo,
    categoria,
    archivo: crudo,
    tamano_bytes: tamano,
  })
  await repo.actualizarRuta(evidenciaId, `/api/evidencias/${evidenciaId}/archivo`)

  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'SUBIR',
    tabla: 'evidencias_avance',
    registroId: evidenciaId,
    detalles: { actividad_id: id, nombre_archivo: nombre, tipo_archivo: tipo, tamano_bytes: tamano },
    ip: ctx.ip,
  })

  return { id: evidenciaId, nombre_archivo: nombre, tipo_archivo: tipo, tamano_bytes: tamano, categoria }
}

export async function listarDeActividad(actividadId) {
  const id = Number(actividadId)
  if (!id) throw new AppError('Actividad no válida', 400, 'actividad_id')
  const filas = await repo.listarPorActividad(id)
  return filas.map((f) => ({ ...f, url: f.ruta_archivo }))
}

export function listarRecientes(limite = 6) {
  return repo.recientes(Math.min(Math.max(Number(limite) || 6, 1), 20))
}

/** Contenido del archivo para descargarlo o mostrarlo. */
export async function contenidoEvidencia(evidenciaId) {
  const fila = await repo.obtener(Number(evidenciaId))
  if (!fila) throw new AppError('La evidencia no existe', 404)
  if (!fila.archivo) throw new AppError('La evidencia no tiene archivo adjunto', 404)
  return {
    buffer: Buffer.from(String(fila.archivo), 'base64'),
    tipo: fila.tipo_archivo ?? 'application/octet-stream',
    nombre: fila.nombre_archivo,
  }
}

export async function eliminarEvidencia(evidenciaId, ctx = {}) {
  const id = Number(evidenciaId)
  const fila = await repo.obtener(id)
  if (!fila) throw new AppError('La evidencia no existe', 404)
  await repo.eliminar(id)
  await bitacora({
    usuarioId: ctx.usuarioId,
    accion: 'ELIMINAR',
    tabla: 'evidencias_avance',
    registroId: id,
    detalles: { nombre_archivo: fila.nombre_archivo },
    ip: ctx.ip,
  })
  return { id }
}
