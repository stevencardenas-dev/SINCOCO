/**
 * NIT colombiano (HU-13 · criterio 1): de 8 a 10 dígitos, guion y dígito de
 * verificación (DV). El DV se calcula con el módulo 11 de la DIAN.
 */

const FORMATO_NIT = /^\d{8,10}-\d$/
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

/** Quita espacios y puntos de millar: `900.123.456-7` → `900123456-7`. */
export function normalizarNit(texto) {
  return String(texto ?? '').replace(/[\s.]/g, '')
}

export function tieneFormatoNit(nit) {
  return FORMATO_NIT.test(nit)
}

/** DV que le corresponde a la base numérica del NIT. */
export function calcularDv(base) {
  const suma = String(base)
    .split('')
    .reverse()
    .reduce((acc, digito, i) => acc + Number(digito) * PESOS[i], 0)
  const resto = suma % 11
  return resto >= 2 ? 11 - resto : resto
}

/** ¿El DV escrito coincide con el calculado? Supone el formato ya validado. */
export function dvValido(nit) {
  const [base, dv] = nit.split('-')
  return calcularDv(base) === Number(dv)
}
