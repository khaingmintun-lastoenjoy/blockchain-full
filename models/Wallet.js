// Wallet model ဖိုင်
const db = require('./index');
const crypto = require('crypto');

class Wallet {
  // Wallet အသစ် ဖန်တီးခြင်း
  static async create(userId, network = 'mainnet') {
    // ရိုးရှင်းသော wallet address ဖန်တီးနည်း (လက်တွေ့တွင် Ethereum wallet ဖန်တီးနည်း သုံးရန်)
    const address = '0x' + crypto.randomBytes(20).toString('hex');
    const privateKey = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Private key ကို encrypt လုပ်ခြင်း (လက်တွေ့တွင် လုံခြုံရေးအတွက် ပိုကောင်းသော နည်းလမ်း သုံးရန်)
    const privateKeyEncrypted = Buffer.from(privateKey).toString('base64');
    
    await db.execute(
      'INSERT INTO wallets (user_id, address, private_key_encrypted, network) VALUES (?, ?, ?, ?)',
      [userId, address, privateKeyEncrypted, network]
    );
    
    return { address, privateKey, network };
  }
  
  // User ID ဖြင့် wallet ရှာဖွေခြင်း
  static async findByUserId(userId) {
    return await db.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  }
  
  // Address ဖြင့် wallet ရှာဖွေခြင်း
  static async findByAddress(address) {
    const wallets = await db.query('SELECT * FROM wallets WHERE address = ?', [address]);
    return wallets[0];
  }
  
  // Balance update လုပ်ခြင်း
  static async updateBalance(address, amount) {
    await db.execute(
      'UPDATE wallets SET balance = balance + ? WHERE address = ?',
      [amount, address]
    );
  }
  
  // Wallet အားလုံး ရယူခြင်း
  static async getAll(limit = 100, offset = 0) {
    return await db.query(
      `SELECT w.*, u.username, u.email 
       FROM wallets w 
       JOIN users u ON w.user_id = u.id 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }
}

module.exports = Wallet;