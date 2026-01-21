// Blockchain core model ဖိုင် - FIXED VERSION
const db = require('./index');
const crypto = require('crypto');
const BlockchainUtils = require('../utils/blockchain');

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.difficulty = 4;
    this.miningReward = 50;
    this.blockTime = 15000; // 15 seconds
  }
  
  // Genesis block ဖန်တီးခြင်း
  async createGenesisBlock() {
    const genesisBlock = {
      block_number: 0,
      hash: '0000000000000000000000000000000000000000000000000000000000000000',
      previous_hash: '0',
      timestamp: Date.now(),
      transactions: [],
      nonce: 0,
      difficulty: 1
    };
    
    genesisBlock.hash = BlockchainUtils.generateBlockHash(
      genesisBlock.block_number,
      genesisBlock.previous_hash,
      genesisBlock.timestamp,
      genesisBlock.transactions,
      genesisBlock.nonce
    );
    
    await this.saveBlockToDB(genesisBlock);
    return genesisBlock;
  }
  
  // Latest block ရယူခြင်း
  async getLatestBlock() {
    const blocks = await db.query(
      'SELECT * FROM blocks ORDER BY block_number DESC LIMIT 1'
    );
    return blocks[0];
  }
  
  // Blocks များ ရယူခြင်း
  async getBlocks(fromBlock = 0, limit = 100) {
    return await db.query(
      `SELECT * FROM blocks WHERE block_number >= ? ORDER BY block_number ASC LIMIT ${limit}`,
      [fromBlock]
    );
  }
  
  // Block ကို database တွင် သိမ်းခြင်း
  async saveBlockToDB(block) {
    try {
      await db.execute(
        `INSERT INTO blocks 
         (block_number, hash, previous_hash, miner_address, difficulty, transactions_count) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          block.block_number,
          block.hash,
          block.previous_hash,
          block.miner_address || 'system',
          block.difficulty || this.difficulty,
          block.transactions ? block.transactions.length : 0
        ]
      );
      
      // Block transactions များကို သိမ်းခြင်း
      if (block.transactions && block.transactions.length > 0) {
        for (const tx of block.transactions) {
          await this.saveTransactionToDB(tx, block.block_number);
        }
      }
      
      return block;
    } catch (error) {
      console.error('Error saving block to DB:', error.message);
      throw error;
    }
  }
  
  // Transaction ကို database တွင် သိမ်းခြင်း
  async saveTransactionToDB(tx, blockNumber) {
    try {
      await db.execute(
        `INSERT INTO transactions 
         (hash, from_address, to_address, amount, token_id, block_number, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed') 
         ON DUPLICATE KEY UPDATE 
         block_number = VALUES(block_number), status = 'confirmed'`,
        [
          tx.hash,
          tx.from,
          tx.to,
          tx.amount,
          tx.token_id || null,
          blockNumber
        ]
      );
    } catch (error) {
      console.error('Error saving transaction to DB:', error.message);
    }
  }
  
  // Add block to chain function - FIXED VERSION
  async addBlock(block) {
    // Validate block before adding
    const isValid = await this.validateBlock(block);
    if (!isValid) {
      console.error(`Invalid block #${block.block_number}: ${block.hash}`);
      
      // Check if it's genesis block or consecutive block
      const latestBlock = await this.getLatestBlock();
      if (!latestBlock && block.block_number === 0) {
        console.log('Attempting to add genesis block despite validation error');
        // Try to save anyway for genesis block
        return await this.saveBlockToDB(block);
      }
      
      throw new Error('Invalid block');
    }
    
    await this.saveBlockToDB(block);
    return block;
  }
  
  // Validate block function - FIXED VERSION
  async validateBlock(block) {
    // Basic validation
    if (!block || typeof block !== 'object') {
      console.error('Block is not an object');
      return false;
    }
    
    if (block.block_number === undefined || block.hash === undefined) {
      console.error('Block missing required fields');
      return false;
    }
    
    // Check if block already exists
    const existingBlock = await this.getBlockByNumber(block.block_number);
    if (existingBlock) {
      console.log(`Block #${block.block_number} already exists`);
      return false;
    }
    
    // For genesis block (block 0), skip hash validation
    if (block.block_number === 0) {
      console.log('Genesis block validation skipped');
      return true;
    }
    
    // Check previous hash for non-genesis blocks
    const previousBlock = await this.getBlockByNumber(block.block_number - 1);
    if (!previousBlock && block.block_number > 0) {
      console.error(`Previous block #${block.block_number - 1} not found`);
      return false;
    }
    
    if (previousBlock && block.previous_hash !== previousBlock.hash) {
      console.error(`Previous hash mismatch for block #${block.block_number}`);
      return false;
    }
    
    // Validate hash if nonce exists
    if (block.nonce !== undefined) {
      try {
        const calculatedHash = BlockchainUtils.generateBlockHash(
          block.block_number,
          block.previous_hash,
          block.timestamp,
          block.transactions || [],
          block.nonce || 0
        );
        
        if (calculatedHash !== block.hash) {
          console.error(`Hash mismatch for block #${block.block_number}`);
          console.error(`Expected: ${calculatedHash}`);
          console.error(`Got: ${block.hash}`);
          return false;
        }
      } catch (error) {
        console.error('Hash calculation error:', error.message);
        return false;
      }
    }
    
    return true;
  }
  
  // Get block by number function
  async getBlockByNumber(blockNumber) {
    const blocks = await db.query(
      'SELECT * FROM blocks WHERE block_number = ?',
      [blockNumber]
    );
    return blocks[0];
  }
  
  // Get block by hash function
  async getBlockByHash(hash) {
    const blocks = await db.query(
      'SELECT * FROM blocks WHERE hash = ?',
      [hash]
    );
    return blocks[0];
  }
  
  // Add transaction function
  async addTransaction(transaction) {
    // Validate transaction
    const isValid = await this.validateTransaction(transaction);
    if (!isValid) {
      throw new Error('Invalid transaction');
    }
    
    this.pendingTransactions.push(transaction);
    
    // Save to database
    await db.execute(
      `INSERT INTO transactions 
       (hash, from_address, to_address, amount, token_id, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        transaction.hash,
        transaction.from,
        transaction.to,
        transaction.amount,
        transaction.token_id || null
      ]
    );
    
    return transaction;
  }
  
  // Validate transaction function
  async validateTransaction(transaction) {
    // Basic validation
    if (!transaction || !transaction.hash || !transaction.from || !transaction.to) {
      return false;
    }
    
    // Check if transaction already exists
    const existingTx = await this.getTransactionByHash(transaction.hash);
    if (existingTx) {
      return false;
    }
    
    // For mining rewards (from zero address), skip balance check
    if (transaction.from === '0x0000000000000000000000000000000000000000') {
      return true;
    }
    
    // Check balance for regular transactions
    const balance = await this.getBalance(transaction.from, transaction.token_id);
    if (balance < transaction.amount) {
      console.error(`Insufficient balance: ${balance} < ${transaction.amount}`);
      return false;
    }
    
    return true;
  }
  
  // Get transaction by hash function
  async getTransactionByHash(hash) {
    const transactions = await db.query(
      'SELECT * FROM transactions WHERE hash = ?',
      [hash]
    );
    return transactions[0];
  }
  
  // Average block time function
  async getAverageBlockTime() {
    const blocks = await db.query(
      `SELECT timestamp FROM blocks 
       WHERE block_number > 0 
       ORDER BY block_number DESC 
       LIMIT 100`
    );
    
    if (blocks.length < 2) return this.blockTime / 1000;
    
    let totalTime = 0;
    for (let i = 0; i < blocks.length - 1; i++) {
      const timeDiff = (new Date(blocks[i].timestamp) - new Date(blocks[i + 1].timestamp)) / 1000;
      totalTime += timeDiff;
    }
    
    return totalTime / (blocks.length - 1);
  }
  
  // New block mine လုပ်ခြင်း
  async mineBlock(minerAddress) {
    const latestBlock = await this.getLatestBlock();
    const blockNumber = latestBlock ? latestBlock.block_number + 1 : 0;
    const previousHash = latestBlock ? latestBlock.hash : '0';
    
    // Get pending transactions from database
    const pendingTxs = await this.getPendingTransactions();
    
    const block = {
      block_number: blockNumber,
      previous_hash: previousHash,
      timestamp: Date.now(),
      transactions: pendingTxs,
      nonce: 0,
      difficulty: this.difficulty,
      miner_address: minerAddress
    };
    
    // Mining reward transaction ထည့်ခြင်း
    const rewardTx = {
      hash: BlockchainUtils.generateTransactionHash(
        '0x0000000000000000000000000000000000000000',
        minerAddress,
        this.miningReward,
        Date.now(),
        0
      ),
      from: '0x0000000000000000000000000000000000000000',
      to: minerAddress,
      amount: this.miningReward,
      timestamp: Date.now(),
      token_id: null
    };
    
    block.transactions.push(rewardTx);
    
    // Proof of Work
    const mined = BlockchainUtils.mineBlock(block, this.difficulty);
    block.hash = mined.hash;
    block.nonce = mined.nonce;
    
    // Block ကို chain ထဲသို့ ထည့်ခြင်း
    await this.saveBlockToDB(block);
    
    // Clear pending transactions from memory
    this.pendingTransactions = [];
    
    // Difficulty adjustment
    await this.adjustDifficulty(blockNumber);
    
    return block;
  }
  
  // Difficulty adjustment
  async adjustDifficulty(blockNumber) {
    if (blockNumber % 10 === 0 && blockNumber > 0) {
      const recentBlocks = await db.query(
        'SELECT * FROM blocks WHERE block_number >= ? ORDER BY block_number DESC LIMIT 10',
        [blockNumber - 9]
      );
      
      if (recentBlocks.length >= 2) {
        const firstBlock = recentBlocks[recentBlocks.length - 1];
        const lastBlock = recentBlocks[0];
        
        const timeDiff = (new Date(lastBlock.timestamp) - new Date(firstBlock.timestamp)) / 1000;
        const avgBlockTime = timeDiff / (recentBlocks.length - 1);
        
        if (avgBlockTime < this.blockTime / 2) {
          this.difficulty += 1;
        } else if (avgBlockTime > this.blockTime * 2) {
          this.difficulty = Math.max(1, this.difficulty - 1);
        }
      }
    }
  }
  
  // Transaction အသစ် ဖန်တီးခြင်း
  async createTransaction(from, to, amount, tokenId = null) {
    const tx = {
      hash: BlockchainUtils.generateTransactionHash(from, to, amount, Date.now(), Math.random()),
      from: from,
      to: to,
      amount: amount,
      token_id: tokenId,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // Balance စစ်ဆေးခြင်း
    const balance = await this.getBalance(from, tokenId);
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }
    
    this.pendingTransactions.push(tx);
    
    // Transaction ကို database တွင် သိမ်းခြင်း
    await db.execute(
      `INSERT INTO transactions 
       (hash, from_address, to_address, amount, token_id, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [tx.hash, tx.from, tx.to, tx.amount, tx.token_id]
    );
    
    return tx;
  }
  
  // Balance ရယူခြင်း
  async getBalance(address, tokenId = null) {
    let balance = 0;
    
    if (tokenId) {
      // Token balance
      const [result] = await db.query(
        `SELECT SUM(CASE 
          WHEN to_address = ? THEN amount 
          WHEN from_address = ? THEN -amount 
          ELSE 0 
        END) as balance 
        FROM transactions 
        WHERE (to_address = ? OR from_address = ?) 
        AND token_id = ? 
        AND status = 'confirmed'`,
        [address, address, address, address, tokenId]
      );
      balance = result.balance || 0;
    } else {
      // Native token balance
      const [result] = await db.query(
        `SELECT SUM(CASE 
          WHEN to_address = ? THEN amount 
          WHEN from_address = ? THEN -amount 
          ELSE 0 
        END) as balance 
        FROM transactions 
        WHERE (to_address = ? OR from_address = ?) 
        AND token_id IS NULL 
        AND status = 'confirmed'`,
        [address, address, address, address]
      );
      balance = result.balance || 0;
    }
    
    return parseFloat(balance) || 0;
  }
  
  // Get pending transactions from database
  async getPendingTransactions(limit = 100) {
    return await db.query(
      `SELECT * FROM transactions 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT ${limit}`,
      []
    );
  }
  
  // Chain validation
  async isValidChain() {
    const blocks = await db.query(
      'SELECT * FROM blocks ORDER BY block_number ASC'
    );
    
    if (blocks.length === 0) return true;
    
    // Genesis block check
    if (blocks[0].block_number !== 0) return false;
    
    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];
      
      // Previous hash check
      if (currentBlock.previous_hash !== previousBlock.hash) {
        console.error(`Chain invalid: Previous hash mismatch at block ${currentBlock.block_number}`);
        return false;
      }
      
      // Skip hash validation for blocks without nonce
      if (currentBlock.nonce === null || currentBlock.nonce === undefined) {
        continue;
      }
      
      // Hash validation
      try {
        const calculatedHash = BlockchainUtils.generateBlockHash(
          currentBlock.block_number,
          currentBlock.previous_hash,
          currentBlock.timestamp,
          [],
          currentBlock.nonce || 0
        );
        
        if (calculatedHash !== currentBlock.hash) {
          console.error(`Chain invalid: Hash mismatch at block ${currentBlock.block_number}`);
          return false;
        }
      } catch (error) {
        console.error(`Hash calculation error at block ${currentBlock.block_number}:`, error.message);
        return false;
      }
    }
    
    return true;
  }
  
  // Chain statistics
  async getChainStats() {
    const [blockCount] = await db.query('SELECT COUNT(*) as count FROM blocks');
    const [txCount] = await db.query('SELECT COUNT(*) as count FROM transactions');
    const [pendingTxCount] = await db.query(
      "SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'"
    );
    
    const latestBlock = await this.getLatestBlock();
    const avgBlockTime = await this.getAverageBlockTime();
    const isValid = await this.isValidChain();
    
    return {
      block_height: latestBlock ? latestBlock.block_number : 0,
      total_blocks: blockCount.count,
      total_transactions: txCount.count,
      pending_transactions: pendingTxCount.count,
      difficulty: this.difficulty,
      mining_reward: this.miningReward,
      block_time: this.blockTime,
      average_block_time: avgBlockTime,
      is_valid: isValid,
      latest_block_hash: latestBlock ? latestBlock.hash : null
    };
  }
  
  // Block explorer data
  async getBlockExplorerData(limit = 20, page = 1) {
    const offset = (page - 1) * limit;
    
    const blocks = await db.query(
      `SELECT b.*, 
              COUNT(t.id) as transaction_count 
       FROM blocks b 
       LEFT JOIN transactions t ON b.block_number = t.block_number 
       GROUP BY b.id 
       ORDER BY b.block_number DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      []
    );
    
    const [totalBlocks] = await db.query('SELECT COUNT(*) as count FROM blocks');
    
    return {
      blocks: blocks,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalBlocks.count / limit),
        total_items: totalBlocks.count,
        items_per_page: limit
      }
    };
  }
  
  // Get total pending transactions count
  async getPendingTransactionsCount() {
    const [result] = await db.query(
      "SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'"
    );
    return result.count;
  }
  
  // Get total transaction count by address
  async getTransactionCountByAddress(address) {
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE from_address = ? OR to_address = ?',
      [address, address]
    );
    return result.count;
  }
  
  // Get recent transactions
  async getRecentTransactions(limit = 20) {
    return await db.query(
      `SELECT t.*, tok.symbol as token_symbol 
       FROM transactions t 
       LEFT JOIN tokens tok ON t.token_id = tok.id 
       WHERE t.status = 'confirmed' 
       ORDER BY t.created_at DESC 
       LIMIT ${limit}`,
      []
    );
  }
  
  // Initialize blockchain
  async initialize() {
    try {
      // Check if genesis block exists
      const latestBlock = await this.getLatestBlock();
      if (!latestBlock) {
        console.log('Creating genesis block...');
        await this.createGenesisBlock();
        console.log('Genesis block created successfully');
      } else {
        console.log(`Blockchain already initialized. Latest block: #${latestBlock.block_number}`);
      }
      
      // Load pending transactions
      this.pendingTransactions = await this.getPendingTransactions();
      console.log(`Loaded ${this.pendingTransactions.length} pending transactions`);
      
      // Validate chain
      const isValid = await this.isValidChain();
      if (!isValid) {
        console.warn('Blockchain validation failed!');
      } else {
        console.log('Blockchain validation passed');
      }
      
      return true;
    } catch (error) {
      console.error('Blockchain initialization failed:', error);
      throw error;
    }
  }
  
  // Clear all data (for testing)
  async clearAll() {
    try {
      await db.execute('DELETE FROM transactions');
      await db.execute('DELETE FROM blocks');
      this.pendingTransactions = [];
      console.log('Blockchain cleared');
    } catch (error) {
      console.error('Error clearing blockchain:', error);
      throw error;
    }
  }
}

module.exports = new Blockchain();