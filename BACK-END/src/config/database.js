const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Pool de conexiones a MySQL, compartido por todos los repositories.
 * Centraliza la configuración de acceso a la base de datos SINCOCO.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
