import { pool } from '../db/pool.js'

/**
 * HU-01 · criterio 4 (RF01 · RNF05).
 *
 * Los permisos del usuario están determinados por los permisos asociados a su
 * rol (`roles_permisos`), no se asignan de forma individual. A diferencia de
 * `requireRole`, que compara el nombre del rol contra una lista fija en el
 * código, `requirePermiso` consulta la relación rol -> permiso en la base: si
 * se reasigna un permiso a un rol, el acceso cambia sin tocar el código.
 *
 * Uso: `router.get('/', requirePermiso('proyectos.listar'), listar)`.
 * Si el rol tiene AL MENOS UNO de los permisos indicados, la petición sigue.
 */
export function requirePermiso(...nombres) {
  return async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT 1
           FROM permisos p
           JOIN roles_permisos rp ON rp.permiso_id = p.id
           JOIN roles r ON r.id = rp.rol_id
          WHERE r.nombre = ? AND p.nombre IN (?)
          LIMIT 1`,
        [req.user.rol, nombres],
      )
      if (rows.length > 0) return next()
      return res.status(403).json({ error: 'No autorizado para este rol' })
    } catch (err) {
      next(err)
    }
  }
}
