// Database connection setup
const mysql = require('mysql2/promise');
const config = require('../config/database').development;

class Database {
  constructor() {
    this.pool = mysql.createPool(config);
  }
  
  async query(sql, params) {
    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }
  
  async execute(sql, params) {
    const [result] = await this.pool.execute(sql, params);
    return result;
  }
  
  async getConnection() {
    return await this.pool.getConnection();
  }
}

module.exports = new Database();