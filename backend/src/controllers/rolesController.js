import { pool } from '../db/pool.js'
import { registrar as bitacora } from '../db/bitacora.js'
import { AppError } from '../utils/AppError.js'

/**
 * HU-01 · criterio 4 (RF01 · RNF05) — administración de roles y permisos.
 *
 * Los permisos del usuario están determinados por los de su rol
 * (`roles_permisos`), no se asignan de forma individual: esta pantalla mueve esa
 * matriz. El administrador puede crear roles, editar su nombre/descripción,
 * eliminarlos (solo si nadie los tiene asignados) y marcar qué permisos concede
 * cada rol.
 *
 * Los cuatro roles base (ADMINISTRADOR, GERENTE, MAESTRO_OBRA,
 * ENCARGADO_BODEGA) son roles de sistema: el código de la interfaz los nombra
 * (RutaPorRol, sidebar, etiquetas), así que no se pueden renombrar ni eliminar;
 * su descripción y sus permisos sí se administran aquí.
 *
 * El seed docs/seed_permisos_prueba.sql carga la matriz inicial; a partir de
 * ahí esta pantalla puede cambiarla.
 */

// Roles que el código referencia por nombre. Renombrarlos dejaría a los
// usuarios de ese rol sin menú ni rutas.
const ROLES_SISTEMA = ['ADMINISTRADOR', 'GERENTE', 'MAESTRO_OBRA', 'ENCARGADO_BODEGA']

const esRolSistema = (nombre) => ROLES_SISTEMA.includes(nombre)

function validarNombre(nombre) {
  const limpio = nombre === undefined || nombre === null ? '' : String(nombre).trim().toUpperCase()
  if (limpio.length < 3 || limpio.length > 50) {
    throw new AppError('El nombre del rol debe tener entre 3 y 50 caracteres', 400, 'nombre')
  }
  if (!/^[A-Z0-9_ ]+$/.test(limpio)) {
    throw new AppError(
      'El nombre del rol solo admite letras, números, espacios y guion bajo',
      400,
      'nombre',
    )
  }
  return limpio
}

function validarDescripcion(descripcion) {
  if (descripcion === undefined || descripcion === null || String(descripcion).trim() === '') {
    return null
  }
  const limpio = String(descripcion).trim()
  if (limpio.length > 255) {
    throw new AppError('La descripción no puede superar los 255 caracteres', 400, 'descripcion')
  }
  return limpio
}

async function findRolPorNombre(nombre) {
  const [[fila]] = await pool.query('SELECT id, nombre FROM roles WHERE nombre = ? LIMIT 1', [nombre])
  return fila || null
}

export async function matrizRolesPermisos(req, res, next) {
  try {
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

    // Catálogo completo: el frontend necesita también los permisos que ningún
    // rol tiene, para que la matriz muestre la fila aunque esté vacía.
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
      roles: roles.map((r) => ({ ...r, es_sistema: esRolSistema(r.nombre) })),
      permisos,
      asignaciones,
    })
  } catch (error) {
    return next(error)
  }
}

/** POST /api/roles -> crear un rol nuevo (nace sin permisos). */
export async function crearRol(req, res, next) {
  try {
    const nombre = validarNombre(req.body?.nombre)
    const descripcion = validarDescripcion(req.body?.descripcion)
    if (await findRolPorNombre(nombre)) {
      throw new AppError('Ya existe un rol con ese nombre', 409, 'nombre')
    }

    const [result] = await pool.query('INSERT INTO roles (nombre, descripcion) VALUES (?, ?)', [
      nombre,
      descripcion,
    ])

    await bitacora({
      usuarioId: req.user.id,
      accion: 'CREAR',
      tabla: 'roles',
      registroId: result.insertId,
      detalles: { nombre },
      ip: req.ip,
    })

    const [[fila]] = await pool.query(
      'SELECT id, nombre, descripcion FROM roles WHERE id = ?',
      [result.insertId],
    )
    return res.status(201).json({ message: 'Rol creado', rol: fila })
  } catch (error) {
    return next(error)
  }
}

/** PATCH /api/roles/:id -> editar nombre y descripción del rol. */
export async function actualizarRol(req, res, next) {
  try {
    const { id } = req.params
    const [[actual]] = await pool.query('SELECT id, nombre FROM roles WHERE id = ?', [id])
    if (!actual) throw new AppError('El rol no existe', 404)

    const campos = {}
    if (req.body?.nombre !== undefined) {
      const nombre = validarNombre(req.body.nombre)
      if (esRolSistema(actual.nombre) && nombre !== actual.nombre) {
        throw new AppError(
          `El rol ${actual.nombre} es un rol base del sistema y no se puede renombrar`,
          400,
          'nombre',
        )
      }
      const existente = await findRolPorNombre(nombre)
      if (existente && Number(existente.id) !== Number(id)) {
        throw new AppError('Ya existe un rol con ese nombre', 409, 'nombre')
      }
      campos.nombre = nombre
    }
    if (req.body?.descripcion !== undefined) {
      campos.descripcion = validarDescripcion(req.body.descripcion)
    }
    if (Object.keys(campos).length === 0) {
      throw new AppError('No hay campos que actualizar', 400)
    }

    const asignaciones = Object.keys(campos).map((c) => `${c} = ?`)
    await pool.query(`UPDATE roles SET ${asignaciones.join(', ')} WHERE id = ?`, [
      ...Object.values(campos),
      id,
    ])

    await bitacora({
      usuarioId: req.user.id,
      accion: 'ACTUALIZAR',
      tabla: 'roles',
      registroId: Number(id),
      detalles: { cambios: campos },
      ip: req.ip,
    })

    const [[fila]] = await pool.query('SELECT id, nombre, descripcion FROM roles WHERE id = ?', [id])
    return res.json({ message: 'Rol actualizado', rol: fila })
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/roles/:id -> eliminar un rol.
 *
 * Regla de negocio: un rol con usuarios asignados no se elimina (hay que
 * reasignarlos primero), porque usuarios.rol_id es obligatorio. Los roles base
 * tampoco se eliminan. No hay baja lógica de roles: la tabla no tiene columna
 * `activo` y los permisos asociados se van con el rol por la FK CASCADE.
 */
export async function eliminarRol(req, res, next) {
  try {
    const { id } = req.params
    const [[rol]] = await pool.query('SELECT id, nombre FROM roles WHERE id = ?', [id])
    if (!rol) throw new AppError('El rol no existe', 404)
    if (esRolSistema(rol.nombre)) {
      throw new AppError(`El rol ${rol.nombre} es un rol base del sistema y no se puede eliminar`, 409)
    }

    const [[{ usuarios }]] = await pool.query(
      'SELECT COUNT(*) AS usuarios FROM usuarios WHERE rol_id = ?',
      [id],
    )
    if (Number(usuarios) > 0) {
      throw new AppError(
        `No se puede eliminar el rol ${rol.nombre}: tiene ${usuarios} ${
          Number(usuarios) === 1 ? 'usuario asignado' : 'usuarios asignados'
        }. Reasígnelos primero.`,
        409,
      )
    }

    await pool.query('DELETE FROM roles WHERE id = ?', [id])

    await bitacora({
      usuarioId: req.user.id,
      accion: 'ELIMINAR',
      tabla: 'roles',
      registroId: Number(id),
      detalles: { nombre: rol.nombre },
      ip: req.ip,
    })

    return res.json({ id: Number(id), eliminado: true })
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/roles/:id/permisos -> reemplaza el conjunto de permisos del rol.
 *
 * Recibe `permiso_ids` (array) y deja `roles_permisos` exactamente con esa
 * lista: la matriz que se ve en la pantalla es la que el backend consulta en
 * cada petición con `requirePermiso`.
 */
export async function asignarPermisos(req, res, next) {
  try {
    const { id } = req.params
    const [[rol]] = await pool.query('SELECT id, nombre FROM roles WHERE id = ?', [id])
    if (!rol) throw new AppError('El rol no existe', 404)

    if (!Array.isArray(req.body?.permiso_ids)) {
      throw new AppError('permiso_ids debe ser una lista de ids de permiso', 400, 'permiso_ids')
    }
    const ids = [...new Set(req.body.permiso_ids.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))]

    if (ids.length > 0) {
      const [existentes] = await pool.query(
        `SELECT id FROM permisos WHERE id IN (${ids.map(() => '?').join(', ')})`,
        ids,
      )
      if (existentes.length !== ids.length) {
        throw new AppError('Alguno de los permisos indicados no existe', 400, 'permiso_ids')
      }
    }

    // Salvaguarda: nadie se deja fuera de esta misma pantalla. Si el rol que
    // administra es el del usuario que hace el cambio, no puede perder
    // `roles.gestionar` (quedaría sin poder volver a concederlo).
    if (rol.nombre === req.user.rol) {
      const [[permiso]] = await pool.query(
        "SELECT id FROM permisos WHERE nombre = 'roles.gestionar' LIMIT 1",
      )
      if (permiso && !ids.includes(Number(permiso.id))) {
        throw new AppError(
          'No puede quitarse a sí mismo el permiso para administrar roles: dejaría el sistema sin forma de volver a concederlo.',
          400,
          'permiso_ids',
        )
      }
    }

    const conexion = await pool.getConnection()
    try {
      await conexion.beginTransaction()
      await conexion.query('DELETE FROM roles_permisos WHERE rol_id = ?', [id])
      if (ids.length > 0) {
        await conexion.query(
          `INSERT INTO roles_permisos (rol_id, permiso_id) VALUES ${ids.map(() => '(?, ?)').join(', ')}`,
          ids.flatMap((permiso_id) => [id, permiso_id]),
        )
      }
      await conexion.commit()
    } catch (error) {
      await conexion.rollback()
      throw error
    } finally {
      conexion.release()
    }

    await bitacora({
      usuarioId: req.user.id,
      accion: 'ASIGNAR_PERMISOS',
      tabla: 'roles_permisos',
      registroId: Number(id),
      detalles: { rol: rol.nombre, permisos: ids.length },
      ip: req.ip,
    })

    return res.json({ id: Number(id), rol: rol.nombre, permisos: ids.length })
  } catch (error) {
    return next(error)
  }
}
