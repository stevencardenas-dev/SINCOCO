import { pool } from '../db/pool.js'

/**
 * HU-17 · criterios 1-4 (RF31 · RF32 · CU-17): consultar la bitácora de
 * trazabilidad.
 *
 * Auditor: administrador. Cada operación crítica ya queda registrada por
 * `db/bitacora.js` con usuario, acción, tabla, registro afectado y fecha; lo que
 * faltaba era poder consultarla con filtros.
 *
 * La bitácora es de SOLO LECTURA e inmutable: este controlador únicamente lee,
 * y no existe ninguna ruta que modifique o borre filas de
 * `bitacora_trazabilidad`. El acceso lo limita `requirePermiso('auditoria.listar')`.
 */

const LIMITE_POR_DEFECTO = 50
const LIMITE_MAXIMO = 200
const FECHA = /^\d{4}-\d{2}-\d{2}$/

// Expresión SQL que da nombre legible al registro afectado, por tabla.
const NOMBRE_ENTIDAD = {
  usuarios: 'username',
  trabajadores: "CONCAT(nombres, ' ', apellidos)",
  proyectos: "CONCAT(codigo, ' · ', nombre)",
  etapas_proyecto: 'nombre',
  actividades: 'nombre',
  clientes: 'razon_social_nombre',
  roles: 'nombre',
  cargos: 'nombre',
  especialidades: 'nombre',
}

/**
 * Añade `entidad` (nombre del registro afectado) a cada fila. Si el registro ya
 * no existe queda en null y la pantalla muestra solo el identificador.
 */
async function resolverEntidades(filas) {
  const idsPorTabla = new Map()
  for (const f of filas) {
    f.entidad = null
    if (f.registro_id == null || !NOMBRE_ENTIDAD[f.tabla_afectada]) continue
    if (!idsPorTabla.has(f.tabla_afectada)) idsPorTabla.set(f.tabla_afectada, new Set())
    idsPorTabla.get(f.tabla_afectada).add(f.registro_id)
  }
  const nombres = new Map()
  for (const [tabla, ids] of idsPorTabla) {
    try {
      const [rows] = await pool.query(
        `SELECT id, ${NOMBRE_ENTIDAD[tabla]} AS nombre FROM ${tabla} WHERE id IN (?)`,
        [[...ids]],
      )
      for (const r of rows) nombres.set(`${tabla}:${r.id}`, r.nombre)
    } catch {
      /* una tabla sin esas columnas no debe tumbar la consulta de la bitácora */
    }
  }
  for (const f of filas) f.entidad = nombres.get(`${f.tabla_afectada}:${f.registro_id}`) ?? null
}

export async function consultar(req, res) {
  const { usuario, tabla, accion, desde, hasta } = req.query

  // RNF04: la validación del formulario no basta, la API se puede llamar directamente.
  for (const [campo, valor] of [['desde', desde], ['hasta', hasta]]) {
    if (valor && !FECHA.test(String(valor))) {
      return res.status(400).json({ error: `${campo} debe tener el formato AAAA-MM-DD` })
    }
  }
  if (desde && hasta && String(desde) > String(hasta)) {
    return res.status(400).json({ error: 'la fecha desde no puede ser posterior a la hasta' })
  }

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

  const limite = Math.min(
    Math.max(Number(req.query.limite) || LIMITE_POR_DEFECTO, 1),
    LIMITE_MAXIMO,
  )
  const pagina = Math.max(Number(req.query.pagina) || 1, 1)
  const desplazamiento = (pagina - 1) * limite

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM bitacora_trazabilidad b
       LEFT JOIN usuarios u ON u.id = b.usuario_id
       ${where}`,
    parametros,
  )

  const [filas] = await pool.query(
    `SELECT b.id, b.usuario_id, b.accion, b.tabla_afectada, b.registro_id,
            b.detalles, b.direccion_ip, b.fecha_registro,
            u.username, r.nombre AS rol
       FROM bitacora_trazabilidad b
       LEFT JOIN usuarios u ON u.id = b.usuario_id
       LEFT JOIN roles r ON r.id = u.rol_id
       ${where}
      ORDER BY b.fecha_registro DESC, b.id DESC
      LIMIT ? OFFSET ?`,
    [...parametros, limite, desplazamiento],
  )

  await resolverEntidades(filas)

  // Facetas para los selectores: se calculan sobre la bitácora completa, no
  // sobre el resultado filtrado, para que el usuario no pierda opciones al filtrar.
  const [acciones] = await pool.query(
    'SELECT DISTINCT accion FROM bitacora_trazabilidad ORDER BY accion',
  )
  const [tablas] = await pool.query(
    `SELECT DISTINCT tabla_afectada FROM bitacora_trazabilidad
      WHERE tabla_afectada IS NOT NULL ORDER BY tabla_afectada`,
  )
  const [usuarios] = await pool.query(
    'SELECT id, username, activo FROM usuarios ORDER BY username',
  )

  res.json({
    generado_en: new Date().toISOString(),
    total,
    pagina,
    limite,
    paginas: Math.max(Math.ceil(total / limite), 1),
    filas,
    filtros: {
      acciones: acciones.map((a) => a.accion),
      tablas: tablas.map((t) => t.tabla_afectada),
      usuarios,
    },
  })
}
