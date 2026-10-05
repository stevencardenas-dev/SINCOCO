import { pool } from '../db/pool.js'

/**
 * Consultas de solo lectura sobre `bitacora_trazabilidad` (HU-17). La
 * bitácora es inmutable: este repositorio no expone ninguna escritura (las
 * altas las hace `db/bitacora.js`).
 */

// Expresión SQL que da nombre legible al registro afectado, por tabla. También
// es la lista blanca de tablas que se pueden interpolar en la consulta.
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

export const tieneNombreEntidad = (tabla) => Boolean(NOMBRE_ENTIDAD[tabla])

export async function contar(where, parametros) {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM bitacora_trazabilidad b
       LEFT JOIN usuarios u ON u.id = b.usuario_id
       ${where}`,
    parametros,
  )
  return total
}

export async function listar(where, parametros, limite, desplazamiento) {
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
  return filas
}

/** Nombre legible de los registros `ids` de `tabla` (solo tablas conocidas). */
export async function nombresDeEntidades(tabla, ids) {
  const [rows] = await pool.query(
    `SELECT id, ${NOMBRE_ENTIDAD[tabla]} AS nombre FROM ${tabla} WHERE id IN (?)`,
    [[...ids]],
  )
  return rows
}

export async function accionesDistintas() {
  const [rows] = await pool.query(
    'SELECT DISTINCT accion FROM bitacora_trazabilidad ORDER BY accion',
  )
  return rows.map((a) => a.accion)
}

export async function tablasDistintas() {
  const [rows] = await pool.query(
    `SELECT DISTINCT tabla_afectada FROM bitacora_trazabilidad
      WHERE tabla_afectada IS NOT NULL ORDER BY tabla_afectada`,
  )
  return rows.map((t) => t.tabla_afectada)
}

export async function usuariosParaFiltro() {
  const [rows] = await pool.query('SELECT id, username, activo FROM usuarios ORDER BY username')
  return rows
}
