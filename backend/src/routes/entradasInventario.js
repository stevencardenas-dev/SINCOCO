import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, ordenes, proveedores, obtener, registrar } from '../controllers/entradaInventarioController.js'

const router = Router()
router.use(requireAuth)

// HU-19: ingreso de materiales al inventario (bodega y administrador).
router.get('/', requirePermiso('entradas_inventario.listar'), listar)
// Antes de '/:id' para que «ordenes» no se lea como un id.
router.get('/ordenes-compra', requirePermiso('entradas_inventario.listar'), ordenes)
// Quien registra ingresos elige el proveedor sin necesitar proveedores.listar (que bodega no tiene).
router.get('/proveedores', requirePermiso('entradas_inventario.crear'), proveedores)
router.get('/:id',requirePermiso('entradas_inventario.listar'), obtener)
router.post('/', requirePermiso('entradas_inventario.crear'), registrar)

export default router
