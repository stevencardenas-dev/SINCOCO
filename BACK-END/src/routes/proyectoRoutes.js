const { Router } = require('express');
const proyectoController = require('../controllers/proyectoController');

const router = Router();

// POST /api/proyectos -> HU-02: Registrar proyecto
router.post('/', proyectoController.registrar);

module.exports = router;
