import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/auth.js'
import usuariosRoutes from './routes/usuarios.js'
import proyectosRoutes from './routes/proyectos.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/proyectos', proyectosRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' })
})

app.use(errorHandler)

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`SINCOCO backend en http://localhost:${port}`))
