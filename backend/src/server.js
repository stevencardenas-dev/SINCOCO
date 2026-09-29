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
import etapasRoutes from './routes/etapas.js'
import actividadesRoutes from './routes/actividades.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/roles', rolesRoutes)
app.use('/api/auditoria', auditoriaRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/proyectos', proyectosRoutes)
app.use('/api/clientes', clientesRoutes)
app.use('/api/trabajadores', trabajadoresRoutes)
app.use('/api/etapas', etapasRoutes)
app.use('/api/actividades', actividadesRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' })
})

app.use(errorHandler)

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`SINCOCO backend en http://localhost:${port}`))
