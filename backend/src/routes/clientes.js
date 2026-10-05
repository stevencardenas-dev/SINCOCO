import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import { listar, registrar, actualizar, baja, reactivarCtrl } from '../controllers/clienteController.js'

const router = Router()
router.use(requireAuth)

// HU-02: catálogo y alta de clientes para el formulario de proyectos (CU-02) y
// la pestaña Clientes de Gestión Administrativa. La descripción del permiso
// `catalogos.gestionar` incluye crear y editar clientes, así que también sirve
// para leerlos y registrarlos: si la matriz se lo concede a un rol, la pestaña
// funciona completa.
router.get('/', requirePermiso('clientes.listar', 'catalogos.gestionar'), listar)
router.post('/', requirePermiso('clientes.crear', 'catalogos.gestionar'), registrar)

// Gestión Administrativa: editar, dar de baja y reactivar clientes. Se pide el
// permiso de gestión del catálogo (`catalogos.gestionar`, administrador y
// gerente) para no dar de baja un cliente desde un rol que solo lo consulta.
router.patch('/:id', requirePermiso('catalogos.gestionar'), actualizar)

// HU-18 · RN07: nunca borrado físico, solo baja lógica y reactivación.
router.patch('/:id/baja', requirePermiso('catalogos.gestionar'), baja)
router.patch('/:id/reactivar', requirePermiso('catalogos.gestionar'), reactivarCtrl)

export default router
