// User model ဖိုင်
const db = require('./index');
const bcrypt = require('bcryptjs');

class User {
  // User အသစ် ဖန်တီးခြင်း
  static async create(userData) {
    const { username, email, password, role = 'user' } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );
    
    return { id: result.insertId, username, email, role };
  }
  
  // Email ဖြင့် user ရှာဖွေခြင်း
  static async findByEmail(email) {
    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return users[0];
  }
  
  // ID ဖြင့် user ရှာဖွေခြင်း
  static async findById(id) {
    const users = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [id]);
    return users[0];
  }
  
  // Password မှန်ကန်မှု စစ်ဆေးခြင်း
  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password);
  }
  
  // User အားလုံး ရယူခြင်း
  static async getAll(limit = 100, offset = 0) {
    return await db.query(
      `SELECT id, username, email, role, created_at FROM users LIMIT ${limit} OFFSET ${offset}`,
      []
    );
  }
}

module.exports = User;