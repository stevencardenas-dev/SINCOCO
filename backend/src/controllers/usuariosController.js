import bcrypt from 'bcrypt'
import { pool } from '../db/pool.js'
import { registrar } from '../db/bitacora.js'

// HU-01: crear usuario con rol asignado
export async function crear(req, res) {
  const { username, password, email, rol_id, trabajador_id } = req.body
  // AYD-13 criterio 1: el usuario debe estar vinculado a un trabajador y a un
  // único rol. trabajador_id era opcional y el criterio lo exige.
  if (!username || !password || !email || !rol_id || !trabajador_id) {
    return res.status(400).json({
      error: 'username, password, email, rol_id y trabajador_id son requeridos',
    })
  }
  // RNF04: la validación del formulario no basta, la API se puede llamar directamente.
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
  }

  const password_hash = await bcrypt.hash(password, 10)
  try {
    const [result] = await pool.query(
      'INSERT INTO usuarios (trabajador_id, username, password_hash, email, rol_id) VALUES (?, ?, ?, ?, ?)',
      [trabajador_id, username, password_hash, email, rol_id],
    )
    await registrar({
      usuarioId: req.user.id, accion: 'CREAR', tabla: 'usuarios',
      registroId: result.insertId, detalles: { username, email, rol_id, trabajador_id }, ip: req.ip,
    })
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      // CU-01 Alt 1: señalar el campo en conflicto, no un error genérico.
      // trabajador_id es UNIQUE: un trabajador no puede tener dos cuentas.
      const campo = /trabajador/.test(err.message) ? 'trabajador'
        : /email/.test(err.message) ? 'email' : 'username'
      const mensaje = campo === 'trabajador'
        ? 'ese trabajador ya tiene una cuenta de usuario'
        : `${campo} ya existe`
      return res.status(409).json({ error: mensaje, campo })
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'el trabajador o el rol indicado no existe' })
    }
    throw err
  }
}

// HU-01: listar usuarios (solo lo visible según su rol lo permite)
export async function listar(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.estado, u.rol_id, r.nombre AS rol,
            TRIM(CONCAT(t.nombres, ' ', t.apellidos)) AS trabajador
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN trabajadores t ON t.id = u.trabajador_id
     ORDER BY u.id`,
  )
  res.json(rows)
}

// CU-01 precondición: el rol a asignar ya existe. El formulario necesita la
// lista para que el administrador elija, en vez de escribir un id a mano.
export async function listarRoles(req, res) {
  const [rows] = await pool.query('SELECT id, nombre, descripcion FROM roles ORDER BY id')
  res.json(rows)
}

// CU-01 criterio 1: el formulario necesita elegir trabajador, no escribir un id.
// Solo trabajadores activos y sin cuenta: usuarios.trabajador_id es UNIQUE.
export async function listarTrabajadoresSinCuenta(req, res) {
  const [rows] = await pool.query(
    `SELECT t.id, t.nombres, t.apellidos, t.numero_documento, t.cargo
     FROM trabajadores t
     LEFT JOIN usuarios u ON u.trabajador_id = t.id
     WHERE u.id IS NULL AND t.activo = 1
     ORDER BY t.nombres, t.apellidos`,
  )
  res.json(rows)
}

// CU-01 Alt 3: cambiar el rol de un usuario existente. Los permisos pasan a ser
// los del rol nuevo; el historial ya registrado no se altera (solo se añade la
// entrada del cambio a la bitácora).
export async function cambiarRol(req, res) {
  const { id } = req.params
  const { rol_id } = req.body
  if (!rol_id) {
    return res.status(400).json({ error: 'rol_id es requerido' })
  }
  const [[previo]] = await pool.query(
    `SELECT u.rol_id, r.nombre AS rol FROM usuarios u
     JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`,
    [id],
  )
  if (!previo) {
    return res.status(404).json({ error: 'usuario no encontrado' })
  }
  if (Number(previo.rol_id) === Number(rol_id)) {
    return res.status(200).json({ id: Number(id), rol_id: Number(rol_id), sinCambio: true })
  }
  const [[rolNuevo]] = await pool.query('SELECT id, nombre FROM roles WHERE id = ?', [rol_id])
  if (!rolNuevo) {
    return res.status(400).json({ error: 'el rol indicado no existe' })
  }
  await pool.query('UPDATE usuarios SET rol_id = ? WHERE id = ?', [rol_id, id])
  await registrar({
    usuarioId: req.user.id, accion: 'ACTUALIZAR', tabla: 'usuarios',
    registroId: Number(id),
    detalles: { campo: 'rol_id', antes: previo.rol, despues: rolNuevo.nombre }, ip: req.ip,
  })
  res.json({ id: Number(id), rol_id: Number(rol_id), rol: rolNuevo.nombre })
}

// HU-01: activar o bloquear un usuario
export async function cambiarEstado(req, res) {
  const { id } = req.params
  const { estado } = req.body
  if (!['ACTIVO', 'INACTIVO', 'BLOQUEADO'].includes(estado)) {
    return res.status(400).json({ error: 'estado inválido' })
  }
  const [[previo]] = await pool.query('SELECT estado FROM usuarios WHERE id = ?', [id])
  await pool.query('UPDATE usuarios SET estado = ? WHERE id = ?', [estado, id])
  await registrar({
    usuarioId: req.user.id, accion: 'ACTUALIZAR', tabla: 'usuarios',
    registroId: Number(id), detalles: { antes: previo?.estado, despues: estado }, ip: req.ip,
  })
  res.json({ id: Number(id), estado })
}
