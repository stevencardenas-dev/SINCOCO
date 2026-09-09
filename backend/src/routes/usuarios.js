import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { crear, listar, cambiarEstado, listarRoles } from '../controllers/usuariosController.js'

const router = Router()
router.use(requireAuth, requireRole('ADMINISTRADOR'))

router.get('/', listar)
router.get('/roles', listarRoles)
router.post('/', crear)
router.patch('/:id/estado', cambiarEstado)

export default router
