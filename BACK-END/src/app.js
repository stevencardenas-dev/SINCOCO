const express = require('express');
const proyectoRoutes = require('./routes/proyectoRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

// HU-02: Registrar proyecto
app.use('/api/proyectos', proyectoRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Recurso no encontrado',
  });
});

// Middleware de errores (debe ir al final)
app.use(errorHandler);

module.exports = app;
