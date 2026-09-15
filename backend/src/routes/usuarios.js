import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  crear, listar, cambiarEstado, listarRoles,
  listarTrabajadoresSinCuenta, cambiarRol,
} from '../controllers/usuariosController.js'

const router = Router()
router.use(requireAuth, requireRole('ADMINISTRADOR'))

router.get('/', listar)
router.get('/roles', listarRoles)
router.get('/trabajadores-disponibles', listarTrabajadoresSinCuenta)
router.post('/', crear)
router.patch('/:id/estado', cambiarEstado)
router.patch('/:id/rol', cambiarRol)

export default router
