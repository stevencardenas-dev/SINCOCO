import bcrypt from 'bcrypt'
import { pool } from '../db/pool.js'

// HU-01: crear usuario con rol asignado
export async function crear(req, res) {
  const { username, password, email, rol_id, trabajador_id } = req.body
  if (!username || !password || !email || !rol_id) {
    return res.status(400).json({ error: 'username, password, email y rol_id son requeridos' })
  }

  const password_hash = await bcrypt.hash(password, 10)
  try {
    const [result] = await pool.query(
      'INSERT INTO usuarios (trabajador_id, username, password_hash, email, rol_id) VALUES (?, ?, ?, ?, ?)',
      [trabajador_id ?? null, username, password_hash, email, rol_id],
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'username o email ya existe' })
    }
    throw err
  }
}

// HU-01: listar usuarios (solo lo visible según su rol lo permite)
export async function listar(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.estado, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
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

// HU-01: activar o bloquear un usuario
export async function cambiarEstado(req, res) {
  const { id } = req.params
  const { estado } = req.body
  if (!['ACTIVO', 'INACTIVO', 'BLOQUEADO'].includes(estado)) {
    return res.status(400).json({ error: 'estado inválido' })
  }
  await pool.query('UPDATE usuarios SET estado = ? WHERE id = ?', [estado, id])
  res.json({ id: Number(id), estado })
}
