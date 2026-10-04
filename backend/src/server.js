import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/auth.js'
import usuariosRoutes from './routes/usuarios.js'
import rolesRoutes from './routes/roles.js'
import auditoriaRoutes from './routes/auditoria.js'
import dashboardRoutes from './routes/dashboard.js'
import proyectosRoutes from './routes/proyectos.js'
import clientesRoutes from './routes/clientes.js'
import trabajadoresRoutes from './routes/trabajadores.js'
import catalogosRoutes from './routes/catalogos.js'
import perfilRoutes from './routes/perfil.js'
import etapasRoutes from './routes/etapas.js'
import actividadesRoutes from './routes/actividades.js'
import asignacionesRoutes from './routes/asignaciones.js'
import { errorHandler } from './middleware/errorHandler.js'
import { rutasSeguras } from './middleware/rutasSeguras.js'

// Red de seguridad del proceso: si algo se escapa fuera de una ruta (una
// promesa rechazada al leer la base, por ejemplo), queda en el log en vez de
// terminar el proceso y dejar sin servicio a todos los conectados.
process.on('unhandledRejection', (motivo) => {
  console.error('[promesa rechazada sin capturar]', motivo)
})

const app = express()
app.use(cors())
app.use(express.json())

// `rutasSeguras` envuelve los controladores para que un AppError lanzado dentro
// de un `async` llegue al errorHandler en vez de tumbar el proceso (ver el
// comentario del middleware).
app.use('/api/auth', rutasSeguras(authRoutes))
app.use('/api/usuarios', rutasSeguras(usuariosRoutes))
app.use('/api/roles', rutasSeguras(rolesRoutes))
app.use('/api/auditoria', rutasSeguras(auditoriaRoutes))
app.use('/api/dashboard', rutasSeguras(dashboardRoutes))
app.use('/api/proyectos', rutasSeguras(proyectosRoutes))
app.use('/api/clientes', rutasSeguras(clientesRoutes))
app.use('/api/trabajadores', rutasSeguras(trabajadoresRoutes))
app.use('/api/catalogos', rutasSeguras(catalogosRoutes))
app.use('/api/perfil', rutasSeguras(perfilRoutes))
app.use('/api/etapas', rutasSeguras(etapasRoutes))
app.use('/api/actividades', rutasSeguras(actividadesRoutes))
app.use('/api/asignaciones', rutasSeguras(asignacionesRoutes))

app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' })
})

app.use(errorHandler)

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`SINCOCO backend en http://localhost:${port}`))
