import { pool } from '../db/pool.js'
import { Proyecto } from '../entities/Proyecto.js'

/**
 * Repositorio de la tabla `proyectos` (HU-02).
 */

/**
 * Verifica si ya existe un proyecto con el código dado.
 * `proyectos.codigo` tiene UNIQUE KEY en el esquema.
 */
export async function findByCodigo(codigo) {
  const [rows] = await pool.query('SELECT id FROM proyectos WHERE codigo = ? LIMIT 1', [codigo])
  return rows[0] || null
}

/**
 * Busca un proyecto por id, con el nombre del cliente y del responsable
 * para las pantallas del módulo de proyectos (CU-02).
 */
export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT p.*, c.razon_social_nombre AS cliente_nombre,
            TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS responsable_nombre
     FROM proyectos p
     JOIN clientes c ON c.id = p.cliente_id
     JOIN trabajadores t ON t.id = p.responsable_id
     WHERE p.id = ? LIMIT 1`,
    [id],
  )
  return Proyecto.fromRow(rows[0])
}

/**
 * Lista proyectos, más recientes primero (módulo de proyectos).
 * Por defecto solo activos; `incluirInactivos` trae también los dados de baja
 * (HU-18: filtro explícito para consultar registros archivados).
 */
/**
 * Lista de proyectos con los filtros de la pantalla. `buscar` cruza nombre,
 * código, cliente, ubicación y responsable; el resto filtra por columna. El
 * volumen de proyectos exige que el filtro corra en la base, no en el navegador.
 */
export async function listar(filtros = {}) {
  const {
    incluirInactivos = false,
    buscar = '',
    estado = '',
    clienteId = null,
    responsableId = null,
    // RBAC: si llega un trabajador, solo se listan los proyectos donde tiene
    // acceso vigente (asignación activa o ser el responsable).
    soloTrabajadorId = null,
  } = filtros
  const condiciones = []
  const params = []

  if (!incluirInactivos) condiciones.push('p.activo = 1')

  if (soloTrabajadorId) {
    condiciones.push(
      `(p.responsable_id = ? OR EXISTS (
         SELECT 1
           FROM asignaciones_personal ap
           LEFT JOIN actividades ac ON ac.id = ap.actividad_id
           LEFT JOIN etapas_proyecto ep ON ep.id = ac.etapa_id
          WHERE ap.trabajador_id = ? AND ap.estado = 'ACTIVO'
            AND (ap.proyecto_id = p.id OR ep.proyecto_id = p.id)
       ))`,
    )
    params.push(soloTrabajadorId, soloTrabajadorId)
  }

  const texto = String(buscar ?? '').trim()
  if (texto) {
    condiciones.push(
      `(p.nombre LIKE ? OR p.codigo LIKE ? OR c.razon_social_nombre LIKE ?
        OR p.ubicacion LIKE ? OR t.nombres LIKE ? OR t.apellidos LIKE ?)`,
    )
    const patron = `%${texto}%`
    params.push(patron, patron, patron, patron, patron, patron)
  }
  if (estado) {
    condiciones.push('p.estado = ?')
    params.push(estado)
  }
  if (clienteId) {
    condiciones.push('p.cliente_id = ?')
    params.push(clienteId)
  }
  if (responsableId) {
    condiciones.push('p.responsable_id = ?')
    params.push(responsableId)
  }

  const [rows] = await pool.query(
    `SELECT p.*, c.razon_social_nombre AS cliente_nombre,
            TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS responsable_nombre
     FROM proyectos p
     JOIN clientes c ON c.id = p.cliente_id
     JOIN trabajadores t ON t.id = p.responsable_id
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY p.creado_en DESC, p.id DESC`,
    params,
  )
  return rows.map(Proyecto.fromRow)
}

/** Compatibilidad: listado completo de activos (sin filtros). */
export async function listarActivos(incluirInactivos = false) {
  return listar({ incluirInactivos })
}

/**
 * Inserta un nuevo proyecto. Recibe un objeto ya validado y con los
 * valores iniciales (estado, porcentaje_avance_total) aplicados por el
 * service. Devuelve el id autogenerado.
 */
/**
 * Actualización parcial del proyecto: solo se escriben los campos recibidos
 * (el service ya validó las reglas de negocio y el `codigo` no es editable).
 */
export async function update(id, campos) {
  const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
  await pool.query(
    `UPDATE proyectos SET ${asignaciones.join(', ')} WHERE id = ?`,
    [...Object.values(campos), id],
  )
}

export async function create(proyecto) {
  const sql = `
    INSERT INTO proyectos (
      codigo, cliente_id, nombre, descripcion, ubicacion,
      fecha_inicio_programada, fecha_fin_programada,
      responsable_id, creado_por_usuario_id,
      presupuesto_inicial, porcentaje_avance_total, estado, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const params = [
    proyecto.codigo,
    proyecto.cliente_id,
    proyecto.nombre,
    proyecto.descripcion,
    proyecto.ubicacion,
    proyecto.fecha_inicio_programada,
    proyecto.fecha_fin_programada,
    proyecto.responsable_id,
    proyecto.creado_por_usuario_id,
    proyecto.presupuesto_inicial,
    proyecto.porcentaje_avance_total,
    proyecto.estado,
    proyecto.observaciones,
  ]

  const [result] = await pool.query(sql, params)
  return result.insertId
}
