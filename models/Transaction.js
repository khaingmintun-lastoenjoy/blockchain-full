// Transaction model ဖိုင်
const db = require('./index');

class Transaction {
  // Transaction အသစ် ဖန်တီးခြင်း
  static async create(txData) {
    const {
      hash,
      from_address,
      to_address,
      amount,
      token_id = null,
      block_number = null,
      status = 'pending',
      gas_price = 0,
      gas_used = 0
    } = txData;
    
    const result = await db.execute(
      `INSERT INTO transactions 
       (hash, from_address, to_address, amount, token_id, block_number, status, gas_price, gas_used) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hash, from_address, to_address, amount, token_id, block_number, status, gas_price, gas_used]
    );
    
    return { id: result.insertId, ...txData };
  }
  
  // Hash ဖြင့် transaction ရှာဖွေခြင်း
  static async findByHash(hash) {
    const txs = await db.query(
      `SELECT t.*, tok.name as token_name, tok.symbol as token_symbol 
       FROM transactions t 
       LEFT JOIN tokens tok ON t.token_id = tok.id 
       WHERE t.hash = ?`,
      [hash]
    );
    return txs[0];
  }
  
  // Address ဖြင့် transaction များ ရှာဖွေခြင်း
  static async findByAddress(address, limit = 50, offset = 0) {
    return await db.query(
      `SELECT t.*, tok.name as token_name, tok.symbol as token_symbol 
       FROM transactions t 
       LEFT JOIN tokens tok ON t.token_id = tok.id 
       WHERE t.from_address = ? OR t.to_address = ? 
       ORDER BY t.created_at DESC 
       LIMIT ? OFFSET ?`,
      [address, address, limit, offset]
    );
  }
  
  // Status အလိုက် transaction များ ရှာဖွေခြင်း
  static async findByStatus(status, limit = 100, offset = 0) {
    return await db.query(
      'SELECT * FROM transactions WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [status, limit, offset]
    );
  }
  
  // Transaction status update လုပ်ခြင်း
  static async updateStatus(hash, status, blockNumber = null) {
    const updateFields = ['status = ?'];
    const params = [status];
    
    if (blockNumber !== null) {
      updateFields.push('block_number = ?');
      params.push(blockNumber);
    }
    
    params.push(hash);
    
    await db.execute(
      `UPDATE transactions SET ${updateFields.join(', ')} WHERE hash = ?`,
      params
    );
  }
  
  // Recent transactions များ ရယူခြင်း
  static async getRecent(limit = 20) {
    return await db.query(
      `SELECT t.*, tok.name as token_name, tok.symbol as token_symbol 
       FROM transactions t 
       LEFT JOIN tokens tok ON t.token_id = tok.id 
       ORDER BY t.created_at DESC 
       LIMIT ?`,
      [limit]
    );
  }
}

module.exports = Transaction;