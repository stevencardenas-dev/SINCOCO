import { pool } from '../db/pool.js'

/**
 * HU-01 · criterio 4 (RF01 · RNF05) — monitoreo de la matriz rol -> permiso.
 *
 * Los permisos del usuario están determinados por los permisos asociados a su
 * rol (`roles_permisos`), no se asignan de forma individual. Esta consulta
 * devuelve esa relación tal como está en la base, para que el administrador
 * pueda auditarla sin abrir un cliente SQL.
 *
 * Es de SOLO LECTURA a propósito: la asignación de permisos se hace por el seed
 * (docs/seed_permisos_prueba.sql), que es la única fuente de verdad de la
 * matriz. Editar permisos desde la interfaz dejaría el repositorio y la base
 * desincronizados, que es justo lo que HU-01 evita.
 */
export async function matrizRolesPermisos(req, res) {
  const [roles] = await pool.query(
    `SELECT r.id, r.nombre, r.descripcion,
            COUNT(DISTINCT rp.permiso_id) AS permisos_activos,
            (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id) AS usuarios,
            (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id AND u.activo = 1) AS usuarios_activos
       FROM roles r
       LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
      GROUP BY r.id, r.nombre, r.descripcion
      ORDER BY r.id`,
  )

  // Catálogo completo: el frontend necesita también los permisos que ningún rol
  // tiene, para que la matriz muestre la fila aunque esté vacía.
  const [permisos] = await pool.query(
    'SELECT id, nombre, descripcion, modulo FROM permisos ORDER BY modulo, nombre',
  )

  // Contenido real de roles_permisos (no se deduce: se lee de la base).
  const [asignaciones] = await pool.query(
    `SELECT rp.rol_id, rp.permiso_id
       FROM roles_permisos rp
       JOIN roles r ON r.id = rp.rol_id
       JOIN permisos p ON p.id = rp.permiso_id
      ORDER BY rp.rol_id, p.modulo, p.nombre`,
  )

  res.json({
    generado_en: new Date().toISOString(),
    roles,
    permisos,
    asignaciones,
  })
}
