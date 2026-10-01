import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { login, logout, solicitarReset, restablecer } from '../controllers/authController.js'

const router = Router()

// HU-01: autenticación.
router.post('/login', login)

// Cierra la sesión vigente en el servidor (sesión única por cuenta).
router.post('/logout', requireAuth, logout)

// HU-01: «¿Olvidó su contraseña?». Son públicas a propósito: el usuario no
// tiene sesión. La solicitud no revela si la cuenta existe y el código es de un
// solo uso con vencimiento (ver services/resetService.js).
router.post('/solicitar-reset', solicitarReset)
router.post('/restablecer', restablecer)

export default router
