/**
 * RNF05 · seguridad: ninguna ruta del backend responde sin token, aunque el
 * frontend arme la petición a mano.
 *
 * Recorre TODOS los routers de src/routes/ y comprueba que cada ruta pasa por
 * `requireAuth` (a nivel de router o de ruta). Solo se admiten sin token las
 * rutas públicas declaradas abajo (iniciar sesión y recuperar contraseña).
 * Además verifica el 401 sin token y el 403 sin permiso de los middleware.
 * Si alguien agrega una ruta sin `requireAuth`, esta prueba falla.
 *
 * Uso: `npm test` (dentro de backend/).
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DIR_RUTAS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/routes')
const PUBLICAS = new Set(['auth.js POST /login', 'auth.js POST /solicitar-reset', 'auth.js POST /restablecer'])

const { requireAuth, requireRole } = await import('../src/middleware/auth.js')

async function inventario() {
  const rutas = []
  for (const archivo of fs.readdirSync(DIR_RUTAS).filter((f) => f.endsWith('.js')).sort()) {
    const router = (await import(pathToFileURL(path.join(DIR_RUTAS, archivo)))).default
    let authGlobal = false
    for (const capa of router.stack) {
      if (!capa.route) {
        if (capa.handle === requireAuth) authGlobal = true
        continue
      }
      const manejadores = capa.route.stack.map((s) => s.handle)
      for (const metodo of Object.keys(capa.route.methods)) {
        rutas.push({
          clave: `${archivo} ${metodo.toUpperCase()} ${capa.route.path}`,
          protegida: authGlobal || manejadores.includes(requireAuth),
        })
      }
    }
  }
  return rutas
}

describe('RNF05 · todas las rutas exigen token', () => {
  test('cada ruta no pública pasa por requireAuth', async () => {
    const rutas = await inventario()
    assert.ok(rutas.length > 100, `se inventariaron ${rutas.length} rutas`)
    const sinProteccion = rutas.filter((r) => !r.protegida && !PUBLICAS.has(r.clave)).map((r) => r.clave)
    assert.deepEqual(sinProteccion, [])
  })

  test('las únicas rutas públicas son login y recuperación de contraseña', async () => {
    const publicas = (await inventario()).filter((r) => !r.protegida).map((r) => r.clave).sort()
    assert.deepEqual(publicas, [...PUBLICAS].sort())
  })

  test('sin cabecera Authorization responde 401 y no llega al controlador', async () => {
    let estado = null
    let siguio = false
    const res = { status(c) { estado = c; return this }, json() { return this } }
    await requireAuth({ headers: {} }, res, () => { siguio = true })
    assert.equal(estado, 401)
    assert.equal(siguio, false)
  })

  test('con un token inválido armado a mano responde 401', async () => {
    let estado = null
    let siguio = false
    const res = { status(c) { estado = c; return this }, json() { return this } }
    await requireAuth({ headers: { authorization: 'Bearer token-inventado' } }, res, () => { siguio = true })
    assert.equal(estado, 401)
    assert.equal(siguio, false)
  })

  test('un rol sin permiso recibe 403', () => {
    let estado = null
    const res = { status(c) { estado = c; return this }, json() { return this } }
    requireRole('ADMINISTRADOR')({ user: { rol: 'MAESTRO_OBRA' } }, res, () => assert.fail('no debe seguir'))
    assert.equal(estado, 403)
  })
})
