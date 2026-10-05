import mysql from 'mysql2/promise'
import 'dotenv/config'

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // Las columnas DATE se entregan como 'YYYY-MM-DD'. Como objeto Date viajarían
  // como medianoche en la zona del servidor y, al serializarse a UTC, el cliente
  // las vería un día antes.
  dateStrings: ['DATE'],
})
