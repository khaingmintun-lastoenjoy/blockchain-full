// Database migration - အခြေခံ table များ ဖန်တီးခြင်း
const mysql = require('mysql2/promise');
const config = require('../config/database').development;

async function createTables() {
  let connection;
  
  try {
    console.log('Database connection ချိတ်ဆက်နေသည်...');
    
    // First connect without database to create it
    const tempConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
    
    // Create database if not exists
    await tempConnection.execute(
      `CREATE DATABASE IF NOT EXISTS ${config.database}`
    );
    
    console.log(`Database '${config.database}' အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။`);
    
    await tempConnection.end();
    
    // Now connect with database name directly
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    console.log('Database tables များ ဖန်တီးနေသည်...');
    
    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'dao_member') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ users table created');
    
    // Wallets table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        address VARCHAR(255) UNIQUE NOT NULL,
        private_key_encrypted TEXT NOT NULL,
        balance DECIMAL(20, 8) DEFAULT 0,
        network VARCHAR(50) DEFAULT 'mainnet',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_address (address),
        INDEX idx_network (network)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ wallets table created');
    
    // Tokens table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(10) UNIQUE NOT NULL,
        contract_address VARCHAR(255),
        total_supply DECIMAL(30, 18),
        decimals INT DEFAULT 18,
        type ENUM('native', 'erc20', 'erc721', 'erc1155') DEFAULT 'erc20',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_symbol (symbol),
        INDEX idx_type (type),
        INDEX idx_contract_address (contract_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ tokens table created');
    
    // Blocks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        block_number INT UNIQUE NOT NULL,
        hash VARCHAR(255) UNIQUE NOT NULL,
        previous_hash VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        transactions_count INT DEFAULT 0,
        miner_address VARCHAR(255),
        difficulty DECIMAL(10, 2),
        nonce BIGINT,
        INDEX idx_block_number (block_number),
        INDEX idx_hash (hash),
        INDEX idx_previous_hash (previous_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ blocks table created');
    
    // Transactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hash VARCHAR(255) UNIQUE NOT NULL,
        from_address VARCHAR(255) NOT NULL,
        to_address VARCHAR(255) NOT NULL,
        amount DECIMAL(30, 18) NOT NULL,
        token_id INT,
        block_number INT,
        status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
        gas_price DECIMAL(20, 9),
        gas_used DECIMAL(20, 9),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_from_address (from_address),
        INDEX idx_to_address (to_address),
        INDEX idx_status (status),
        INDEX idx_block_number (block_number),
        INDEX idx_token_id (token_id),
        FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL,
        FOREIGN KEY (block_number) REFERENCES blocks(block_number) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ transactions table created');
    
    // Smart Contracts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address VARCHAR(255) UNIQUE NOT NULL,
        abi TEXT,
        bytecode TEXT,
        creator_id INT,
        type ENUM('defi', 'nft', 'dao', 'bridge', 'other') DEFAULT 'other',
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id),
        INDEX idx_address (address),
        INDEX idx_type (type),
        INDEX idx_creator_id (creator_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ contracts table created');
    
    // DAO table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS daos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        contract_address VARCHAR(255),
        governance_token_id INT,
        creator_id INT,
        voting_duration INT DEFAULT 86400,
        min_quorum DECIMAL(5, 2) DEFAULT 51.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (governance_token_id) REFERENCES tokens(id),
        FOREIGN KEY (creator_id) REFERENCES users(id),
        INDEX idx_creator_id (creator_id),
        INDEX idx_governance_token_id (governance_token_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ daos table created');
    
    // DAO Proposals table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dao_proposals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dao_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        proposer_id INT NOT NULL,
        status ENUM('pending', 'active', 'passed', 'rejected', 'executed') DEFAULT 'pending',
        votes_for INT DEFAULT 0,
        votes_against INT DEFAULT 0,
        start_time TIMESTAMP NULL,
        end_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dao_id) REFERENCES daos(id) ON DELETE CASCADE,
        FOREIGN KEY (proposer_id) REFERENCES users(id),
        INDEX idx_dao_id (dao_id),
        INDEX idx_status (status),
        INDEX idx_proposer_id (proposer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ dao_proposals table created');
    
    // Bridge transactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bridge_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source_network VARCHAR(50) NOT NULL,
        target_network VARCHAR(50) NOT NULL,
        source_tx_hash VARCHAR(255),
        target_tx_hash VARCHAR(255),
        amount DECIMAL(30, 18) NOT NULL,
        token_id INT,
        sender_address VARCHAR(255) NOT NULL,
        receiver_address VARCHAR(255) NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_source_target (source_network, target_network),
        INDEX idx_sender_address (sender_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ bridge_transactions table created');
    
    // DeFi Pools table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS defi_pools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contract_address VARCHAR(255),
        token_a_id INT NOT NULL,
        token_b_id INT NOT NULL,
        total_liquidity DECIMAL(30, 18) DEFAULT 0,
        apr DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (token_a_id) REFERENCES tokens(id),
        FOREIGN KEY (token_b_id) REFERENCES tokens(id),
        INDEX idx_tokens (token_a_id, token_b_id),
        INDEX idx_apr (apr)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ defi_pools table created');
    
    // User tokens table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_id INT NOT NULL,
        balance DECIMAL(30, 18) DEFAULT 0,
        wallet_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_token (user_id, token_id),
        INDEX idx_user_id (user_id),
        INDEX idx_token_id (token_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ user_tokens table created');
    
    console.log('✅ Database tables အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။');
    
  } catch (error) {
    console.error('❌ Table ဖန်တီးရာတွင် error ဖြစ်နေသည်:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
createTables().then(() => {
  console.log('Migration completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});