// Block model ဖိုင်
const db = require('./index');

class Block {
  // Block အသစ် ဖန်တီးခြင်း
  static async create(blockData) {
    const {
      block_number,
      hash,
      previous_hash = null,
      miner_address,
      difficulty = 1.0,
      transactions_count = 0
    } = blockData;
    
    const result = await db.execute(
      `INSERT INTO blocks 
       (block_number, hash, previous_hash, miner_address, difficulty, transactions_count) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [block_number, hash, previous_hash, miner_address, difficulty, transactions_count]
    );
    
    return { id: result.insertId, ...blockData };
  }
  
  // Block number ဖြင့် block ရှာဖွေခြင်း
  static async findByNumber(blockNumber) {
    const blocks = await db.query('SELECT * FROM blocks WHERE block_number = ?', [blockNumber]);
    return blocks[0];
  }
  
  // Hash ဖြင့် block ရှာဖွေခြင်း
  static async findByHash(hash) {
    const blocks = await db.query('SELECT * FROM blocks WHERE hash = ?', [hash]);
    return blocks[0];
  }
  
  // Latest blocks များ ရယူခြင်း
  static async getLatest(limit = 10) {
    return await db.query(
      'SELECT * FROM blocks ORDER BY block_number DESC LIMIT ?',
      [limit]
    );
  }
  
  // Block range ရယူခြင်း
  static async getRange(fromBlock, toBlock, limit = 100) {
    return await db.query(
      `SELECT * FROM blocks 
       WHERE block_number >= ? AND block_number <= ? 
       ORDER BY block_number DESC 
       LIMIT ?`,
      [fromBlock, toBlock, limit]
    );
  }
  
  // Total block count ရယူခြင်း
  static async getTotalCount() {
    const [result] = await db.query('SELECT COUNT(*) as count FROM blocks');
    return result.count;
  }
  
  // Average block time တွက်ချက်ခြင်း
  static async getAverageBlockTime() {
    const blocks = await db.query(
      `SELECT timestamp FROM blocks 
       ORDER BY block_number DESC 
       LIMIT 100`
    );
    
    if (blocks.length < 2) return 0;
    
    let totalTime = 0;
    for (let i = 0; i < blocks.length - 1; i++) {
      const timeDiff = new Date(blocks[i].timestamp) - new Date(blocks[i + 1].timestamp);
      totalTime += timeDiff;
    }
    
    return totalTime / (blocks.length - 1) / 1000; // seconds
  }
  
  // Block transactions count update လုပ်ခြင်း
  static async updateTransactionsCount(blockNumber, count) {
    await db.execute(
      'UPDATE blocks SET transactions_count = ? WHERE block_number = ?',
      [count, blockNumber]
    );
  }
  
  // Difficulty statistics ရယူခြင်း
  static async getDifficultyStats() {
    const stats = await db.query(`
      SELECT 
        MIN(difficulty) as min_difficulty,
        MAX(difficulty) as max_difficulty,
        AVG(difficulty) as avg_difficulty
      FROM blocks
    `);
    return stats[0];
  }
}

module.exports = Block;