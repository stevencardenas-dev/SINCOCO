import * as auditoriaRepository from '../repositories/auditoriaRepository.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-17 · criterios 1-4 (RF31 · RF32 · CU-17): consultar la bitácora de
 * trazabilidad.
 *
 * Auditor: administrador. Cada operación crítica ya queda registrada por
 * `db/bitacora.js` con usuario, acción, tabla, registro afectado y fecha; lo que
 * faltaba era poder consultarla con filtros.
 *
 * La bitácora es de SOLO LECTURA e inmutable: este service únicamente lee, y no
 * existe ninguna ruta que modifique o borre filas de `bitacora_trazabilidad`.
 * El acceso lo limita `requirePermiso('auditoria.listar')`.
 */

const LIMITE_POR_DEFECTO = 50
const LIMITE_MAXIMO = 200
const FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Añade `entidad` (nombre del registro afectado) a cada fila. Si el registro ya
 * no existe queda en null y la pantalla muestra solo el identificador.
 */
async function resolverEntidades(filas) {
  const idsPorTabla = new Map()
  for (const f of filas) {
    f.entidad = null
    if (f.registro_id == null || !auditoriaRepository.tieneNombreEntidad(f.tabla_afectada)) continue
    if (!idsPorTabla.has(f.tabla_afectada)) idsPorTabla.set(f.tabla_afectada, new Set())
    idsPorTabla.get(f.tabla_afectada).add(f.registro_id)
  }
  const nombres = new Map()
  for (const [tabla, ids] of idsPorTabla) {
    try {
      for (const r of await auditoriaRepository.nombresDeEntidades(tabla, ids)) {
        nombres.set(`${tabla}:${r.id}`, r.nombre)
      }
    } catch {
      /* una tabla sin esas columnas no debe tumbar la consulta de la bitácora */
    }
  }
  for (const f of filas) f.entidad = nombres.get(`${f.tabla_afectada}:${f.registro_id}`) ?? null
}

/** Arma el WHERE y sus parámetros a partir de los filtros de la consulta. */
function construirFiltro({ usuario, tabla, accion, desde, hasta }) {
  const condiciones = []
  const parametros = []
  if (usuario) {
    // El filtro acepta el id (lo que manda el selector) o el nombre de usuario.
    if (/^\d+$/.test(String(usuario))) {
      condiciones.push('b.usuario_id = ?')
      parametros.push(Number(usuario))
    } else {
      condiciones.push('u.username = ?')
      parametros.push(String(usuario))
    }
  }
  if (tabla) {
    condiciones.push('b.tabla_afectada = ?')
    parametros.push(String(tabla))
  }
  if (accion) {
    condiciones.push('b.accion = ?')
    parametros.push(String(accion))
  }
  if (desde) {
    condiciones.push('b.fecha_registro >= ?')
    parametros.push(`${desde} 00:00:00`)
  }
  if (hasta) {
    condiciones.push('b.fecha_registro <= ?')
    parametros.push(`${hasta} 23:59:59`)
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  return { where, parametros }
}

export async function consultarBitacora(query = {}) {
  const { desde, hasta } = query

  // RNF04: la validación del formulario no basta, la API se puede llamar directamente.
  for (const [campo, valor] of [['desde', desde], ['hasta', hasta]]) {
    if (valor && !FECHA.test(String(valor))) {
      throw new AppError(`${campo} debe tener el formato AAAA-MM-DD`, 400)
    }
  }
  if (desde && hasta && String(desde) > String(hasta)) {
    throw new AppError('la fecha desde no puede ser posterior a la hasta', 400)
  }

  const { where, parametros } = construirFiltro(query)
  const limite = Math.min(Math.max(Number(query.limite) || LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO)
  const pagina = Math.max(Number(query.pagina) || 1, 1)

  const total = await auditoriaRepository.contar(where, parametros)
  const filas = await auditoriaRepository.listar(where, parametros, limite, (pagina - 1) * limite)
  await resolverEntidades(filas)

  // Facetas para los selectores: se calculan sobre la bitácora completa, no
  // sobre el resultado filtrado, para que el usuario no pierda opciones al filtrar.
  return {
    generado_en: new Date().toISOString(),
    total,
    pagina,
    limite,
    paginas: Math.max(Math.ceil(total / limite), 1),
    filas,
    filtros: {
      acciones: await auditoriaRepository.accionesDistintas(),
      tablas: await auditoriaRepository.tablasDistintas(),
      usuarios: await auditoriaRepository.usuariosParaFiltro(),
    },
  }
}
