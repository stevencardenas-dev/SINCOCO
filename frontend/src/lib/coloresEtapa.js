/**
 * Color de cada etapa en el presupuesto y en el cronograma.
 *
 * Las 8 primeras usan una paleta fija; desde la novena se generan con el
 * ángulo áureo, de modo que nunca se repiten por muchas etapas que tenga el
 * proyecto.
 */
const PALETA = ['#0ea5e9', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16', '#6366f1', '#f97316']

export const colorEtapa = (indice) =>
  indice < PALETA.length ? PALETA[indice] : `hsl(${Math.round((200 + indice * 137.508) % 360)} 62% 50%)`
