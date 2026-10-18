/**
 * Reduce una foto (de la galería o de la cámara) antes de subirla: una foto de
 * móvil pesa varios MB y no hace falta tanto para una evidencia. Devuelve una
 * data URL JPEG con el lado mayor limitado.
 */
export async function reducirImagen(archivo, ladoMax = 1600, calidad = 0.8) {
  if (!archivo?.type?.startsWith('image/')) throw new Error('Elige una imagen (JPG, PNG o WEBP).')
  const bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(bitmap.width * escala)
  lienzo.height = Math.round(bitmap.height * escala)
  lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height)
  bitmap.close?.()
  return lienzo.toDataURL('image/jpeg', calidad)
}
