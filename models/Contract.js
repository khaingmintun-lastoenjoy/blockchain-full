// Smart Contract model ဖိုင်
const db = require('./index');

class Contract {
  // Contract အသစ် ဖန်တီးခြင်း
  static async create(contractData) {
    const {
      name,
      address,
      abi = null,
      bytecode = null,
      creator_id,
      type = 'other',
      verified = false
    } = contractData;
    
    const result = await db.execute(
      `INSERT INTO contracts 
       (name, address, abi, bytecode, creator_id, type, verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, address, abi, bytecode, creator_id, type, verified]
    );
    
    return { id: result.insertId, ...contractData };
  }
  
  // ID ဖြင့် contract ရှာဖွေခြင်း
  static async findById(id) {
    const contracts = await db.query(
      `SELECT c.*, u.username as creator_name 
       FROM contracts c 
       JOIN users u ON c.creator_id = u.id 
       WHERE c.id = ?`,
      [id]
    );
    return contracts[0];
  }
  
  // Address ဖြင့် contract ရှာဖွေခြင်း
  static async findByAddress(address) {
    const contracts = await db.query(
      `SELECT c.*, u.username as creator_name 
       FROM contracts c 
       JOIN users u ON c.creator_id = u.id 
       WHERE c.address = ?`,
      [address]
    );
    return contracts[0];
  }
  
  // Type အလိုက် contracts များ ရယူခြင်း
  static async findByType(type, limit = 100, offset = 0) {
    return await db.query(
      `SELECT c.*, u.username as creator_name 
       FROM contracts c 
       JOIN users u ON c.creator_id = u.id 
       WHERE c.type = ? 
       ORDER BY c.created_at DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      [type]
    );
  }
  
  // Verified contracts များ ရယူခြင်း
  static async getVerified(limit = 100, offset = 0) {
    return await db.query(
      `SELECT c.*, u.username as creator_name 
       FROM contracts c 
       JOIN users u ON c.creator_id = u.id 
       WHERE c.verified = true 
       ORDER BY c.created_at DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      []
    );
  }
  
  // Creator ဖြင့် contracts များ ရယူခြင်း
  static async findByCreator(creatorId, limit = 100, offset = 0) {
    return await db.query(
      `SELECT c.*, u.username as creator_name 
       FROM contracts c 
       JOIN users u ON c.creator_id = u.id 
       WHERE c.creator_id = ? 
       ORDER BY c.created_at DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      [creatorId]
    );
  }
  
  // Contract verify လုပ်ခြင်း
  static async verify(id) {
    await db.execute(
      'UPDATE contracts SET verified = true WHERE id = ?',
      [id]
    );
  }
  
  // Contract ဖျက်ခြင်း
  static async delete(id, userId) {
    const contract = await this.findById(id);
    
    if (!contract) {
      throw new Error('Contract not found');
    }
    
    // Creator သို့မဟုတ် admin သာ ဖျက်နိုင်သည်
    if (contract.creator_id !== userId) {
      // Admin check လုပ်ရန် user table မှ စစ်ရန်
      const [users] = await db.query(
        'SELECT role FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0 || users[0].role !== 'admin') {
        throw new Error('Permission denied');
      }
    }
    
    await db.execute('DELETE FROM contracts WHERE id = ?', [id]);
  }
  
  // Contract statistics ရယူခြင်း
  static async getStatistics() {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_contracts,
        SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) as verified_contracts,
        COUNT(DISTINCT type) as contract_types,
        COUNT(DISTINCT creator_id) as unique_creators
      FROM contracts
    `);
    return stats[0];
  }
  
  // Contract type distribution
  static async getTypeDistribution() {
    return await db.query(`
      SELECT type, COUNT(*) as count 
      FROM contracts 
      GROUP BY type 
      ORDER BY count DESC
    `);
  }
}

module.exports = Contract;