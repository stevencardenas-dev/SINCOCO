import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, actualizar, baja, reactivarCtrl } from '../controllers/clienteController.js'

const router = Router()
router.use(requireAuth)

// HU-02: catálogo y alta de clientes para el formulario de proyectos (CU-02).
router.get('/', requirePermiso('clientes.listar'), listar)
router.post('/', requirePermiso('clientes.crear'), registrar)

// Pantalla de Catálogo: editar, dar de baja y reactivar clientes. Se pide el
// permiso de gestión del catálogo (`catalogos.gestionar`, solo administrador)
// para no dar de baja un cliente desde un rol que solo debe consultarlo.
router.patch('/:id', requirePermiso('catalogos.gestionar'), actualizar)

// HU-18 · RN07: nunca borrado físico, solo baja lógica y reactivación.
router.patch('/:id/baja', requirePermiso('catalogos.gestionar'), baja)
router.patch('/:id/reactivar', requirePermiso('catalogos.gestionar'), reactivarCtrl)

export default router
