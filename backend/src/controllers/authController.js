import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'
import { registrar } from '../db/bitacora.js'

// HU-01: login — valida credenciales y estado de cuenta, emite JWT
export async function login(req, res) {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son requeridos' })
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.estado, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     WHERE u.username = ?`,
    [username],
  )
  const user = rows[0]
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })
  if (user.estado !== 'ACTIVO') {
    const leyenda = user.estado === 'BLOQUEADO' ? 'bloqueada' : 'inactiva'
    return res.status(403).json({ error: `Cuenta ${leyenda}. Contacte al administrador.` })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' })

  await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id])
  await registrar({
    usuarioId: user.id, accion: 'AUTENTICAR', tabla: 'usuarios',
    registroId: user.id, ip: req.ip,
  })

  const token = jwt.sign({ id: user.id, username: user.username, rol: user.rol }, process.env.JWT_SECRET, {
    expiresIn: '8h',
  })
  res.json({ token, user: { id: user.id, username: user.username, rol: user.rol } })
}
