import { Router, raw } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requirePermiso } from '../middleware/permisos.js'
import {
  listar, obtener, registrar, actualizar, baja, reactivarCtrl,
  documentos, adjuntar, descargar, eliminar,
} from '../controllers/proveedorController.js'
import { MIME_PERMITIDOS, TAMANO_MAXIMO } from '../services/proveedorService.js'

const router = Router()
router.use(requireAuth)

// HU-13: catálogo, alta y edición de proveedores. Solo el administrador tiene
// estos permisos (docs/migraciones/pendientes/migracion_proveedores.sql).
router.get('/', requirePermiso('proveedores.listar'), listar)
router.post('/', requirePermiso('proveedores.crear'), registrar)
router.get('/:id', requirePermiso('proveedores.listar'), obtener)
router.patch('/:id', requirePermiso('proveedores.editar'), actualizar)

// Baja lógica: un proveedor inactivo no se asocia a nuevas órdenes (criterio 4).
router.patch('/:id/baja', requirePermiso('proveedores.dar_baja'), baja)
router.patch('/:id/reactivar', requirePermiso('proveedores.dar_baja'), reactivarCtrl)

// Documentos de soporte (criterio 3). El archivo viaja como cuerpo crudo; el
// express.json global no lo toca porque solo se aceptan PDF, PNG o JPG.
router.get('/:id/documentos', requirePermiso('proveedores.listar'), documentos)
router.post(
  '/:id/documentos',
  requirePermiso('proveedores.documentos'),
  raw({ type: MIME_PERMITIDOS, limit: TAMANO_MAXIMO }),
  adjuntar,
)
router.get('/:id/documentos/:docId', requirePermiso('proveedores.listar'), descargar)
router.delete('/:id/documentos/:docId', requirePermiso('proveedores.documentos'), eliminar)

export default router
