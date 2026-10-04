import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { login, logout, latido, misPermisos, solicitarReset, restablecer } from '../controllers/authController.js'

const router = Router()

// HU-01: autenticación.
router.post('/login', login)

// Sesión única por cuenta: cerrar sesión libera la cuenta de inmediato y el
// latido la mantiene activa mientras la aplicación siga abierta.
router.post('/logout', requireAuth, logout)
router.get('/sesion', requireAuth, latido)
// Permisos vigentes del rol, para que la interfaz muestre solo lo que puede hacer.
router.get('/permisos', requireAuth, misPermisos)

// HU-01: «¿Olvidó su contraseña?». Son públicas a propósito: el usuario no
// tiene sesión. La solicitud no revela si la cuenta existe y el código es de un
// solo uso con vencimiento (ver services/resetService.js).
router.post('/solicitar-reset', solicitarReset)
router.post('/restablecer', restablecer)

export default router
