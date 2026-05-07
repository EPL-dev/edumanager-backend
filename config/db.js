// config/db.js — Connexion MySQL Railway

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'trolley.proxy.rlwy.net',
  port:     parseInt(process.env.DB_PORT) || 19009,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'railway',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  ssl: { rejectUnauthorized: false },
  timezone: '+00:00',
});

const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL Railway connecté : ' + process.env.DB_HOST);
    conn.release();
  } catch (error) {
    console.error('❌ Erreur connexion MySQL Railway :', error.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
