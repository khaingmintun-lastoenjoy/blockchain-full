// Enhanced features table migrations
const mysql = require('mysql2/promise');
const config = require('../config/database').development;

async function createEnhancedTables() {
  let connection;
  
  try {
    console.log('Enhanced features tables များ ဖန်တီးနေသည်...');
    
    // Connect with database name directly
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    // Network Peers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS network_peers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        peer_id VARCHAR(64) UNIQUE NOT NULL,
        address VARCHAR(255) NOT NULL,
        version VARCHAR(20),
        capabilities TEXT,
        is_active BOOLEAN DEFAULT true,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_peer_id (peer_id),
        INDEX idx_last_seen (last_seen),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ network_peers table created');
    
    // Contract Events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contract_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_address VARCHAR(255) NOT NULL,
        event_name VARCHAR(100) NOT NULL,
        event_data JSON,
        block_number INT,
        transaction_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_contract_address (contract_address),
        INDEX idx_event_name (event_name),
        INDEX idx_block_number (block_number),
        INDEX idx_transaction_hash (transaction_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ contract_events table created');
    
    // Contract Executions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contract_executions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_address VARCHAR(255) NOT NULL,
        function_name VARCHAR(100) NOT NULL,
        caller VARCHAR(255) NOT NULL,
        parameters JSON,
        result JSON,
        gas_used DECIMAL(20, 9),
        transaction_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_contract_address (contract_address),
        INDEX idx_caller (caller),
        INDEX idx_function_name (function_name),
        INDEX idx_transaction_hash (transaction_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ contract_executions table created');
    
    // Contract Transfers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contract_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_address VARCHAR(255) NOT NULL,
        sender VARCHAR(255) NOT NULL,
        amount DECIMAL(30, 18) NOT NULL,
        transaction_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_contract_address (contract_address),
        INDEX idx_sender (sender),
        INDEX idx_transaction_hash (transaction_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ contract_transfers table created');
    
    // Token Mappings table (for bridge)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS token_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source_network VARCHAR(50) NOT NULL,
        target_network VARCHAR(50) NOT NULL,
        source_token_id INT NOT NULL,
        target_token_id INT NOT NULL,
        source_token_address VARCHAR(255),
        target_token_address VARCHAR(255),
        bridge_fee DECIMAL(5, 4) DEFAULT 0.001,
        min_amount DECIMAL(30, 18) DEFAULT 0.0001,
        max_amount DECIMAL(30, 18) DEFAULT 10000,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_mapping (source_network, target_network, source_token_address(100)),
        FOREIGN KEY (source_token_id) REFERENCES tokens(id),
        FOREIGN KEY (target_token_id) REFERENCES tokens(id),
        INDEX idx_networks (source_network, target_network),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ token_mappings table created');
    
    // Bridge Events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bridge_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        event_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_type (event_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ bridge_events table created');
    
    // Mining Statistics table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mining_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        miner_address VARCHAR(255) NOT NULL,
        block_number INT NOT NULL,
        hash_rate DECIMAL(15, 2),
        difficulty DECIMAL(10, 2),
        mining_time_ms INT,
        reward DECIMAL(20, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_miner_address (miner_address),
        INDEX idx_block_number (block_number),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ mining_statistics table created');
    
    // Network Configs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS network_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        network_key VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        rpc_url VARCHAR(255),
        chain_id INT,
        native_token VARCHAR(10),
        bridge_contract VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_network_key (network_key),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ network_configs table created');
    
    // P2P Messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS p2p_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_type VARCHAR(50) NOT NULL,
        sender_peer_id VARCHAR(64),
        receiver_peer_id VARCHAR(64),
        message_data JSON,
        delivered BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sender_peer_id (sender_peer_id),
        INDEX idx_receiver_peer_id (receiver_peer_id),
        INDEX idx_message_type (message_type),
        INDEX idx_delivered (delivered)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ p2p_messages table created');
    
    // Node Statistics table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS node_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        node_id VARCHAR(64) NOT NULL,
        peer_count INT DEFAULT 0,
        block_height INT DEFAULT 0,
        mempool_size INT DEFAULT 0,
        uptime_seconds BIGINT DEFAULT 0,
        memory_usage_mb DECIMAL(10, 2),
        cpu_usage_percent DECIMAL(5, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_node_id (node_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ node_statistics table created');
    
    // Node Settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS node_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ node_settings table created');
    
    // Network Statistics table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS network_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        total_nodes INT DEFAULT 0,
        active_nodes INT DEFAULT 0,
        total_transactions BIGINT DEFAULT 0,
        avg_block_time DECIMAL(10, 2),
        network_hash_rate DECIMAL(20, 2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recorded_at (recorded_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ network_statistics table created');
    
    console.log('✅ Enhanced features tables အားလုံး အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။');
    
  } catch (error) {
    console.error('❌ Enhanced tables ဖန်တီးရာတွင် error ဖြစ်နေသည်:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
createEnhancedTables().then(() => {
  console.log('Enhanced features migration completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Enhanced features migration failed:', error);
  process.exit(1);
});