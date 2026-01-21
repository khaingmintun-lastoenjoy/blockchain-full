// Initial data များ ထည့်သွင်းခြင်း
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../config/database').development;

async function seedData() {
  let connection;
  
  try {
    console.log('Initial data များ ထည့်သွင်းနေသည်...');
    
    // Connect with database name directly
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    // Admin user ဖန်တီးခြင်း
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
      'INSERT IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@blockchain.com', hashedPassword, 'admin']
    );
    console.log('✓ Admin user created');
    
    // Regular user ဖန်တီးခြင်း
    const userPassword = await bcrypt.hash('user123', 10);
    await connection.query(
      'INSERT IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['user1', 'user1@blockchain.com', userPassword, 'user']
    );
    console.log('✓ Regular user created');
    
    // DAO member user ဖန်တီးခြင်း
    await connection.query(
      'INSERT IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['daomember', 'dao@blockchain.com', userPassword, 'dao_member']
    );
    console.log('✓ DAO member user created');
    
    // Native tokens ထည့်သွင်းခြင်း
    await connection.query(`
      INSERT IGNORE INTO tokens (name, symbol, contract_address, total_supply, decimals, type) 
      VALUES 
      ('Ethereum', 'ETH', NULL, 120000000, 18, 'native'),
      ('Bitcoin', 'BTC', NULL, 21000000, 8, 'native'),
      ('BNB', 'BNB', NULL, 165000000, 18, 'native'),
      ('USD Coin', 'USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 10000000000, 6, 'erc20'),
      ('Tether', 'USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 10000000000, 6, 'erc20'),
      ('Dai Stablecoin', 'DAI', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 5000000000, 18, 'erc20'),
      ('Chainlink', 'LINK', '0x514910771AF9Ca656af840dff83E8264EcF986CA', 1000000000, 18, 'erc20')
    `);
    console.log('✓ Tokens created');
    
    // Genesis block ဖန်တီးခြင်း
    await connection.query(`
      INSERT IGNORE INTO blocks (block_number, hash, previous_hash, miner_address, difficulty) 
      VALUES (0, '0000000000000000000000000000000000000000000000000000000000000000', NULL, 'genesis', 1.0)
    `);
    console.log('✓ Genesis block created');
    
    // Sample block
    await connection.query(`
      INSERT IGNORE INTO blocks (block_number, hash, previous_hash, miner_address, difficulty, transactions_count) 
      VALUES (1, '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 
              '0000000000000000000000000000000000000000000000000000000000000000', 
              '0xmineraddress', 2.5, 10)
    `);
    console.log('✓ Sample block created');
    
    // Sample DeFi pool
    await connection.query(`
      INSERT IGNORE INTO defi_pools (name, contract_address, token_a_id, token_b_id, total_liquidity, apr) 
      VALUES ('ETH-USDC Pool', '0xpooladdress123', 1, 4, 1000000.50, 5.25)
    `);
    console.log('✓ DeFi pool created');
    
    // Sample DAO
    await connection.query(`
      INSERT IGNORE INTO daos (name, description, governance_token_id, creator_id, voting_duration, min_quorum) 
      VALUES ('Community DAO', 'Decentralized community governance', 7, 1, 172800, 60.0)
    `);
    console.log('✓ DAO created');
    
    // Sample network configs
    await connection.query(`
      INSERT IGNORE INTO network_configs (network_key, name, chain_id, native_token, is_active) 
      VALUES 
      ('ethereum', 'Ethereum Mainnet', 1, 'ETH', true),
      ('bsc', 'Binance Smart Chain', 56, 'BNB', true),
      ('polygon', 'Polygon', 137, 'MATIC', true),
      ('arbitrum', 'Arbitrum', 42161, 'ETH', true)
    `);
    console.log('✓ Network configs created');
    
    // Sample node settings
    await connection.query(`
      INSERT IGNORE INTO node_settings (setting_key, setting_value, description) 
      VALUES 
      ('p2p_enabled', 'true', 'Enable P2P networking'),
      ('mining_enabled', 'false', 'Enable mining'),
      ('bridge_enabled', 'true', 'Enable cross-chain bridge'),
      ('api_rate_limit', '100', 'API rate limit per 15 minutes')
    `);
    console.log('✓ Node settings created');
    
    console.log('✅ Initial data များ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။');
    
  } catch (error) {
    console.error('❌ Data ထည့်သွင်းရာတွင် error ဖြစ်နေသည်:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run seeding
seedData().then(() => {
  console.log('Seeding completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});