// Token model ဖိုင်
const db = require('./index');

class Token {
  // Token အသစ် ဖန်တီးခြင်း
  static async create(tokenData) {
    const {
      name,
      symbol,
      contract_address = null,
      total_supply,
      decimals = 18,
      type = 'erc20',
      created_by = null
    } = tokenData;
    
    const result = await db.execute(
      `INSERT INTO tokens 
       (name, symbol, contract_address, total_supply, decimals, type, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, symbol, contract_address, total_supply, decimals, type, created_by]
    );
    
    return { id: result.insertId, ...tokenData };
  }
  
  // ID ဖြင့် token ရှာဖွေခြင်း
  static async findById(id) {
    const tokens = await db.query(
      `SELECT t.*, u.username as creator_name 
       FROM tokens t 
       LEFT JOIN users u ON t.created_by = u.id 
       WHERE t.id = ?`,
      [id]
    );
    return tokens[0];
  }
  
  // Symbol ဖြင့် token ရှာဖွေခြင်း
  static async findBySymbol(symbol) {
    const tokens = await db.query('SELECT * FROM tokens WHERE symbol = ?', [symbol]);
    return tokens[0];
  }
  
  // Contract address ဖြင့် token ရှာဖွေခြင်း
  static async findByContractAddress(address) {
    const tokens = await db.query(
      'SELECT * FROM tokens WHERE contract_address = ?',
      [address]
    );
    return tokens[0];
  }
  
  // Type အလိုက် tokens များ ရယူခြင်း
  static async findByType(type, limit = 100, offset = 0) {
    return await db.query(
      `SELECT t.*, u.username as creator_name 
       FROM tokens t 
       LEFT JOIN users u ON t.created_by = u.id 
       WHERE t.type = ? 
       ORDER BY t.created_at DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      [type]
    );
  }
  
  // Verified tokens များ ရယူခြင်း
  static async getVerifiedTokens(limit = 100) {
    return await db.query(
      `SELECT t.*, u.username as creator_name 
       FROM tokens t 
       LEFT JOIN users u ON t.created_by = u.id 
       WHERE t.contract_address IS NOT NULL 
       ORDER BY t.created_at DESC 
       LIMIT ${limit}`,
      []
    );
  }
  
  // Top tokens by transactions
  static async getTopTokensByTransactions(limit = 10) {
    return await db.query(
      `SELECT t.*, COUNT(tx.id) as transaction_count 
       FROM tokens t 
       LEFT JOIN transactions tx ON t.id = tx.token_id 
       GROUP BY t.id 
       ORDER BY transaction_count DESC 
       LIMIT ${limit}`,
      []
    );
  }
  
  // Token metadata update လုပ်ခြင်း
  static async update(id, updateData) {
    const updateFields = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    }
    
    if (updateFields.length === 0) return false;
    
    params.push(id);
    
    await db.execute(
      `UPDATE tokens SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    return true;
  }
  
  // Token ဖျက်ခြင်း (Admin only)
  static async delete(id) {
    await db.execute('DELETE FROM tokens WHERE id = ?', [id]);
  }
  
  // Token statistics ရယူခြင်း
  static async getStatistics() {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_tokens,
        COUNT(DISTINCT type) as token_types,
        SUM(total_supply) as total_supply_all,
        AVG(decimals) as avg_decimals
      FROM tokens
    `);
    return stats[0];
  }
}

module.exports = Token;