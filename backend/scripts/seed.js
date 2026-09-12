// Siembra los usuarios de prueba con hashes bcrypt reales.
// Uso: node scripts/seed.js
// El SQL de docs/seed_usuarios_prueba.sql deja un hash de marcador que no
// sirve para iniciar sesión; este script lo reemplaza por uno real.
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { pool } from '../src/db/pool.js'

const PASSWORD = process.env.SEED_PASSWORD || 'Prueba123!'

const USUARIOS = [
  { username: 'admin', rol: 'ADMINISTRADOR' },
  { username: 'gerente', rol: 'GERENTE' },
  { username: 'maestro', rol: 'MAESTRO_OBRA' },
  { username: 'bodega', rol: 'ENCARGADO_BODEGA' },
]

const hash = await bcrypt.hash(PASSWORD, 10)
let actualizados = 0

for (const { username, rol } of USUARIOS) {
  const [res] = await pool.query('UPDATE usuarios SET password_hash = ? WHERE username = ?', [hash, username])
  if (res.affectedRows) {
    actualizados++
    console.log(`  ${username.padEnd(11)} ${rol}`)
  } else {
    console.warn(`  ${username.padEnd(11)} NO EXISTE — corre antes docs/seed_usuarios_prueba.sql`)
  }
}

console.log(`\n${actualizados}/${USUARIOS.length} usuarios con contraseña "${PASSWORD}"`)
await pool.end()
