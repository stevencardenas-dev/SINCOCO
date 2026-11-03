/** Búsqueda de texto libre: el texto coincide si aparece (sin distinguir mayúsculas) en alguno de los campos. */
export const coincide = (texto, ...campos) => {
  const t = String(texto ?? '').trim().toLowerCase()
  return !t || campos.some((c) => String(c ?? '').toLowerCase().includes(t))
}
