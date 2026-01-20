// Initial data များ ထည့်သွင်းခြင်း
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../config/database').development;

async function seedData() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('Initial data များ ထည့်သွင်းနေသည်...');
    
    // Admin user ဖန်တီးခြင်း
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(
      'INSERT IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@blockchain.com', hashedPassword, 'admin']
    );
    
    // Native tokens ထည့်သွင်းခြင်း
    await connection.execute(`
      INSERT IGNORE INTO tokens (name, symbol, contract_address, total_supply, decimals, type) 
      VALUES 
      ('Ethereum', 'ETH', NULL, 120000000, 18, 'native'),
      ('Bitcoin', 'BTC', NULL, 21000000, 8, 'native'),
      ('BNB', 'BNB', NULL, 165000000, 18, 'native'),
      ('USD Coin', 'USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 10000000000, 6, 'erc20'),
      ('Tether', 'USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 10000000000, 6, 'erc20')
    `);
    
    // Genesis block ဖန်တီးခြင်း
    await connection.execute(`
      INSERT IGNORE INTO blocks (block_number, hash, previous_hash, miner_address, difficulty) 
      VALUES (0, '0000000000000000000000000000000000000000000000000000000000000000', NULL, 'genesis', 1.0)
    `);
    
    console.log('Initial data များ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။');
    
  } catch (error) {
    console.error('Data ထည့်သွင်းရာတွင် error ဖြစ်နေသည်:', error);
  } finally {
    await connection.end();
  }
}

seedData();