import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { AppError } from './AppError.js'

/**
 * Fotos de evidencia (HU-14). Llegan como data URL en base64 (el frontend ya las
 * redujo), se validan por su firma real y se guardan en disco con un nombre
 * aleatorio: nunca se usa el nombre que mande el cliente.
 */
export const DIR_SUBIDAS = process.env.UPLOADS_DIR || '/opt/sincoco/uploads'
const DIR_INCIDENCIAS = path.join(DIR_SUBIDAS, 'incidencias')
const MAX_BYTES = 1.5 * 1024 * 1024

const FORMATOS = {
  'image/jpeg': { ext: 'jpg', firma: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', firma: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', firma: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
}

/** Valida y guarda la foto; devuelve el nombre del archivo o null si no vino foto. */
export async function guardarFoto(dataUrl) {
  if (!dataUrl) return null
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl))
  const formato = m && FORMATOS[m[1]]
  if (!formato) throw new AppError('La foto debe ser una imagen JPG, PNG o WEBP', 400, 'foto')
  const buffer = Buffer.from(m[2], 'base64')
  if (buffer.length > MAX_BYTES) throw new AppError('La foto es demasiado pesada (máximo 1,5 MB)', 413, 'foto')
  if (!formato.firma(buffer)) throw new AppError('El archivo no es una imagen válida', 400, 'foto')

  const nombre = `${randomUUID()}.${formato.ext}`
  await mkdir(DIR_INCIDENCIAS, { recursive: true })
  await writeFile(path.join(DIR_INCIDENCIAS, nombre), buffer)
  return nombre
}

/** Ruta absoluta de una foto guardada; rechaza nombres que intenten salirse de la carpeta. */
export function rutaFoto(nombre) {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) return null
  return path.join(DIR_INCIDENCIAS, nombre)
}

export async function borrarFoto(nombre) {
  const ruta = nombre && rutaFoto(nombre)
  if (ruta) await unlink(ruta).catch(() => {})
}
