// Database migration - အခြေခံ table များ ဖန်တီးခြင်း
const mysql = require('mysql2/promise');
const config = require('../config/database').development;

async function createTables() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('Database tables များ ဖန်တီးနေသည်...');
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'dao_member') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Wallets table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        address VARCHAR(255) UNIQUE NOT NULL,
        private_key_encrypted TEXT NOT NULL,
        balance DECIMAL(20, 8) DEFAULT 0,
        network VARCHAR(50) DEFAULT 'mainnet',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tokens table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(10) UNIQUE NOT NULL,
        contract_address VARCHAR(255) UNIQUE,
        total_supply DECIMAL(30, 18),
        decimals INT DEFAULT 18,
        type ENUM('native', 'erc20', 'erc721', 'erc1155') DEFAULT 'erc20',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    // Blocks table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        block_number INT UNIQUE NOT NULL,
        hash VARCHAR(255) UNIQUE NOT NULL,
        previous_hash VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        transactions_count INT DEFAULT 0,
        miner_address VARCHAR(255),
        difficulty DECIMAL(10, 2)
      )
    `);
    
    // Transactions table
    await connection.execute(`
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
        INDEX idx_from (from_address),
        INDEX idx_to (to_address),
        FOREIGN KEY (token_id) REFERENCES tokens(id),
        FOREIGN KEY (block_number) REFERENCES blocks(block_number)
      )
    `);
    
    // Smart Contracts table
    await connection.execute(`
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
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);
    
    // DAO table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS daos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        contract_address VARCHAR(255),
        governance_token_id INT,
        creator_id INT,
        voting_duration INT DEFAULT 86400, -- seconds
        min_quorum DECIMAL(5, 2) DEFAULT 51.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (governance_token_id) REFERENCES tokens(id),
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);
    
    // DAO Proposals table
    await connection.execute(`
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
        FOREIGN KEY (dao_id) REFERENCES daos(id),
        FOREIGN KEY (proposer_id) REFERENCES users(id)
      )
    `);
    
    // Bridge table
    await connection.execute(`
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
        FOREIGN KEY (token_id) REFERENCES tokens(id)
      )
    `);
    
    // DeFi Pools table
    await connection.execute(`
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
        FOREIGN KEY (token_b_id) REFERENCES tokens(id)
      )
    `);
    
    console.log('Database tables အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။');
    
  } catch (error) {
    console.error('Table ဖန်တီးရာတွင် error ဖြစ်နေသည်:', error);
  } finally {
    await connection.end();
  }
}

createTables();