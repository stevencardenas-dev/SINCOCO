/**
 * Punto 1 · las pruebas son condición de merge y de despliegue: protege la
 * configuración de CI contra cambios que la desactiven sin querer.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.github/workflows')
const leer = (f) => fs.readFileSync(path.join(WF, f), 'utf8')

describe('CI · pruebas en pull request y antes de desplegar', () => {
  test('pruebas-pr.yml corre npm test en cada pull request hacia main', () => {
    const wf = leer('pruebas-pr.yml')
    assert.match(wf, /pull_request:\s*\n\s*branches: \[main\]/)
    assert.match(wf, /name: Pruebas backend \(npm test\)/)
    assert.match(wf, /run: npm test/)
  })

  test('el despliegue depende del job de pruebas', () => {
    const wf = leer('desplegar.yml')
    assert.match(wf, /needs: \[pruebas\]/)
    assert.match(wf, /test\/\*\.test\.js/)
  })

  test('la prueba E2E de materiales corre en el despliegue y en cada pull request', () => {
    assert.match(leer('desplegar.yml'), /test_e2e_materiales\.py/)
    assert.match(leer('pruebas-pr.yml'), /run: python3 test_e2e_materiales\.py/)
  })
})
