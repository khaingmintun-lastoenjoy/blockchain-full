// Database configuration ဖိုင်
require('dotenv').config();

module.exports = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'blockchain_all',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
};