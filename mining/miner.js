// Blockchain Miner ဖိုင်
const crypto = require('crypto');
const db = require('../models/index');
const Blockchain = require('../models/Blockchain');
const P2PNode = require('../p2p/peer');

class BlockchainMiner {
  constructor(minerAddress, p2pPort = 5002) {
    this.minerAddress = minerAddress;
    this.isMining = false;
    this.currentBlock = null;
    this.miningThreads = 1;
    this.p2pNode = null;
    this.blockchain = Blockchain;
    
    // Start P2P node
    this.startP2PNode(p2pPort);
  }
  
  // P2P node start လုပ်ခြင်း
  startP2PNode(port) {
    this.p2pNode = new P2PNode(port);
    this.p2pNode.start();
    
    // Connect to bootstrap nodes
    setTimeout(() => {
      this.p2pNode.connectToPeer('localhost', 5002);
      this.p2pNode.connectToPeer('localhost', 5003);
    }, 2000);
  }
  
  // Mining start လုပ်ခြင်း
  async startMining() {
    if (this.isMining) {
      console.log('Mining is already in progress');
      return;
    }
    
    this.isMining = true;
    console.log(`Mining started with address: ${this.minerAddress}`);
    
    while (this.isMining) {
      try {
        await this.mineNextBlock();
        
        // Wait before next block
        await this.delay(1000);
      } catch (error) {
        console.error('Mining error:', error);
        await this.delay(5000);
      }
    }
  }
  
  // Mining stop လုပ်ခြင်း
  stopMining() {
    this.isMining = false;
    console.log('Mining stopped');
  }
  
  // Next block mine လုပ်ခြင်း
  async mineNextBlock() {
    // Get pending transactions
    const pendingTxs = await this.getPendingTransactions();
    
    if (pendingTxs.length === 0) {
      console.log('No pending transactions to mine');
      return null;
    }
    
    // Create block template
    const latestBlock = await this.blockchain.getLatestBlock();
    const blockNumber = latestBlock ? latestBlock.block_number + 1 : 0;
    const previousHash = latestBlock ? latestBlock.hash : '0';
    const difficulty = this.blockchain.difficulty;
    
    this.currentBlock = {
      block_number: blockNumber,
      previous_hash: previousHash,
      timestamp: Date.now(),
      transactions: pendingTxs,
      nonce: 0,
      difficulty: difficulty,
      miner_address: this.minerAddress
    };
    
    console.log(`Mining block #${blockNumber} with ${pendingTxs.length} transactions...`);
    
    // Start mining (Proof of Work)
    const startTime = Date.now();
    const minedBlock = await this.proofOfWork(this.currentBlock);
    const miningTime = Date.now() - startTime;
    
    console.log(`Block #${blockNumber} mined in ${miningTime}ms, nonce: ${minedBlock.nonce}`);
    
    // Add block to blockchain
    await this.blockchain.saveBlockToDB(minedBlock);
    
    // Update transaction statuses
    await this.updateTransactionStatuses(minedBlock.transactions, blockNumber);
    
    // Broadcast new block to network
    if (this.p2pNode) {
      await this.p2pNode.broadcastBlock(minedBlock);
    }
    
    // Calculate mining reward
    const reward = this.calculateMiningReward(difficulty, miningTime);
    
    return {
      block: minedBlock,
      miningTime: miningTime,
      reward: reward,
      hashRate: this.calculateHashRate(miningTime, minedBlock.nonce)
    };
  }
  
  // Proof of Work algorithm
  async proofOfWork(block) {
    const target = '0'.repeat(block.difficulty);
    let nonce = 0;
    let hash = '';
    
    while (this.isMining) {
      hash = this.calculateBlockHash(block, nonce);
      
      if (hash.substring(2, 2 + block.difficulty) === target) {
        block.hash = hash;
        block.nonce = nonce;
        return block;
      }
      
      nonce++;
      
      // Yield to prevent blocking
      if (nonce % 10000 === 0) {
        await this.delay(0);
      }
    }
    
    throw new Error('Mining stopped');
  }
  
  // Block hash calculate လုပ်ခြင်း
  calculateBlockHash(block, nonce) {
    const data = JSON.stringify({
      block_number: block.block_number,
      previous_hash: block.previous_hash,
      timestamp: block.timestamp,
      transactions: block.transactions,
      nonce: nonce
    });
    
    return '0x' + crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Pending transactions ရယူခြင်း
  async getPendingTransactions(limit = 100) {
    const txs = await db.query(
      `SELECT * FROM transactions 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT ${limit}`,
      []
    );
    
    return txs.map(tx => ({
      hash: tx.hash,
      from: tx.from_address,
      to: tx.to_address,
      amount: tx.amount,
      token_id: tx.token_id,
      timestamp: tx.created_at
    }));
  }
  
  // Transaction statuses update လုပ်ခြင်း
  async updateTransactionStatuses(transactions, blockNumber) {
    for (const tx of transactions) {
      await db.execute(
        `UPDATE transactions 
         SET status = 'confirmed', block_number = ? 
         WHERE hash = ?`,
        [blockNumber, tx.hash]
      );
    }
  }
  
  // Mining reward calculate လုပ်ခြင်း
  calculateMiningReward(difficulty, miningTime) {
    const baseReward = this.blockchain.miningReward;
    const difficultyBonus = difficulty * 0.1;
    const timeBonus = Math.max(0, 1 - (miningTime / this.blockchain.blockTime));
    
    return baseReward + difficultyBonus + timeBonus;
  }
  
  // Hash rate calculate လုပ်ခြင်း
  calculateHashRate(miningTime, nonce) {
    if (miningTime === 0) return 0;
    return (nonce / miningTime * 1000).toFixed(2); // Hashes per second
  }
  
  // Delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Get miner statistics
  async getMinerStats() {
    const [blocksMined] = await db.query(
      'SELECT COUNT(*) as count FROM blocks WHERE miner_address = ?',
      [this.minerAddress]
    );
    
    const [totalRewards] = await db.query(
      `SELECT SUM(amount) as total 
       FROM transactions 
       WHERE to_address = ? 
         AND from_address = '0x0000000000000000000000000000000000000000'`,
      [this.minerAddress]
    );
    
    const recentBlocks = await db.query(
      `SELECT block_number, hash, created_at 
       FROM blocks 
       WHERE miner_address = ? 
       ORDER BY block_number DESC 
       LIMIT 10`,
      [this.minerAddress]
    );
    
    return {
      minerAddress: this.minerAddress,
      isMining: this.isMining,
      blocksMined: blocksMined.count,
      totalRewards: totalRewards.total || 0,
      hashRate: this.currentHashRate || 0,
      difficulty: this.blockchain.difficulty,
      miningReward: this.blockchain.miningReward,
      recentBlocks: recentBlocks
    };
  }
  
  // Get network mining statistics
  async getNetworkMiningStats() {
    const [totalMiners] = await db.query(
      'SELECT COUNT(DISTINCT miner_address) as count FROM blocks'
    );
    
    const [totalBlocks] = await db.query('SELECT COUNT(*) as count FROM blocks');
    const [latestBlock] = await db.query(
      'SELECT * FROM blocks ORDER BY block_number DESC LIMIT 1'
    );
    
    const miners = await db.query(`
      SELECT miner_address, COUNT(*) as blocks_mined, MAX(block_number) as latest_block
      FROM blocks 
      GROUP BY miner_address 
      ORDER BY blocks_mined DESC 
      LIMIT 10
    `);
    
    // Calculate network hash rate (estimated)
    const recentBlocks = await db.query(`
      SELECT block_number, created_at, difficulty 
      FROM blocks 
      ORDER BY block_number DESC 
      LIMIT 100
    `);
    
    let totalHashRate = 0;
    if (recentBlocks.length >= 2) {
      for (let i = 0; i < recentBlocks.length - 1; i++) {
        const timeDiff = (new Date(recentBlocks[i].created_at) - 
                         new Date(recentBlocks[i + 1].created_at)) / 1000;
        if (timeDiff > 0) {
          // Estimated hashes = 2^difficulty * nonce attempts
          const estimatedHashes = Math.pow(2, recentBlocks[i].difficulty) * 1000000;
          totalHashRate += estimatedHashes / timeDiff;
        }
      }
      totalHashRate /= (recentBlocks.length - 1);
    }
    
    return {
      totalMiners: totalMiners.count,
      totalBlocks: totalBlocks.count,
      latestBlock: latestBlock[0] || null,
      networkHashRate: (totalHashRate / 1e9).toFixed(2) + ' GH/s',
      topMiners: miners,
      blockTime: this.blockchain.blockTime / 1000 + ' seconds',
      difficulty: this.blockchain.difficulty
    };
  }
  
  // Set mining threads
  setMiningThreads(threads) {
    this.miningThreads = Math.max(1, Math.min(threads, 8));
    console.log(`Mining threads set to: ${this.miningThreads}`);
  }
  
  // Get mining configuration
  getMiningConfig() {
    return {
      minerAddress: this.minerAddress,
      miningThreads: this.miningThreads,
      isMining: this.isMining,
      difficulty: this.blockchain.difficulty,
      miningReward: this.blockchain.miningReward,
      blockTime: this.blockchain.blockTime,
      p2pPort: this.p2pNode ? this.p2pNode.port : null,
      peerCount: this.p2pNode ? this.p2pNode.getPeerCount() : 0
    };
  }
}

// Mining Pool Implementation
class MiningPool {
  constructor(poolAddress, feePercentage = 1.0) {
    this.poolAddress = poolAddress;
    this.feePercentage = feePercentage;
    this.miners = new Map(); // minerAddress -> { shares: number, lastShare: timestamp }
    this.totalShares = 0;
    this.poolBalance = 0;
  }
  
  // Miner register လုပ်ခြင်း
  registerMiner(minerAddress) {
    if (!this.miners.has(minerAddress)) {
      this.miners.set(minerAddress, {
        shares: 0,
        lastShare: Date.now(),
        joinedAt: Date.now(),
        pendingReward: 0
      });
      console.log(`Miner registered: ${minerAddress}`);
    }
    return true;
  }
  
  // Miner share submit လုပ်ခြင်း
  submitShare(minerAddress, shareDifficulty) {
    if (!this.miners.has(minerAddress)) {
      throw new Error('Miner not registered');
    }
    
    const miner = this.miners.get(minerAddress);
    miner.shares += shareDifficulty;
    miner.lastShare = Date.now();
    this.totalShares += shareDifficulty;
    
    console.log(`Share submitted by ${minerAddress}, difficulty: ${shareDifficulty}`);
    
    return {
      success: true,
      shares: miner.shares,
      totalShares: this.totalShares
    };
  }
  
  // Block found သတ်မှတ်ခြင်း
  async blockFound(blockReward, finderAddress) {
    console.log(`Block found by ${finderAddress}, reward: ${blockReward}`);
    
    // Calculate pool fee
    const poolFee = blockReward * (this.feePercentage / 100);
    const distributableReward = blockReward - poolFee;
    
    // Add to pool balance
    this.poolBalance += poolFee;
    
    // Distribute reward to miners based on shares
    for (const [minerAddress, minerData] of this.miners.entries()) {
      if (minerData.shares > 0) {
        const minerShare = minerData.shares / this.totalShares;
        const minerReward = distributableReward * minerShare;
        
        minerData.pendingReward += minerReward;
        
        console.log(`Miner ${minerAddress} earned ${minerReward} (${(minerShare * 100).toFixed(2)}%)`);
      }
    }
    
    // Reset shares for next round
    this.resetShares();
    
    return {
      success: true,
      blockReward: blockReward,
      poolFee: poolFee,
      distributedReward: distributableReward
    };
  }
  
  // Shares reset လုပ်ခြင်း
  resetShares() {
    for (const miner of this.miners.values()) {
      miner.shares = 0;
    }
    this.totalShares = 0;
  }
  
  // Miner rewards claim လုပ်ခြင်း
  claimRewards(minerAddress) {
    if (!this.miners.has(minerAddress)) {
      throw new Error('Miner not registered');
    }
    
    const miner = this.miners.get(minerAddress);
    const reward = miner.pendingReward;
    
    if (reward <= 0) {
      throw new Error('No rewards to claim');
    }
    
    // Reset pending reward
    miner.pendingReward = 0;
    
    console.log(`Rewards claimed by ${minerAddress}: ${reward}`);
    
    return {
      success: true,
      minerAddress: minerAddress,
      reward: reward,
      transactionHash: '0x' + crypto.randomBytes(32).toString('hex')
    };
  }
  
  // Pool statistics ရယူခြင်း
  getPoolStats() {
    const activeMiners = Array.from(this.miners.values()).filter(
      miner => Date.now() - miner.lastShare < 3600000 // Active within last hour
    ).length;
    
    const totalPendingRewards = Array.from(this.miners.values()).reduce(
      (sum, miner) => sum + miner.pendingReward, 0
    );
    
    return {
      poolAddress: this.poolAddress,
      feePercentage: this.feePercentage,
      totalMiners: this.miners.size,
      activeMiners: activeMiners,
      totalShares: this.totalShares,
      poolBalance: this.poolBalance,
      totalPendingRewards: totalPendingRewards,
      hashRate: this.calculatePoolHashRate()
    };
  }
  
  // Pool hash rate calculate လုပ်ခြင်း
  calculatePoolHashRate() {
    // Estimated based on shares submitted recently
    const recentMiners = Array.from(this.miners.values()).filter(
      miner => Date.now() - miner.lastShare < 300000 // Last 5 minutes
    );
    
    if (recentMiners.length === 0) return '0 H/s';
    
    const totalRecentShares = recentMiners.reduce((sum, miner) => sum + miner.shares, 0);
    const estimatedHashRate = (totalRecentShares * 1000) / 300; // Hashes per second
    
    if (estimatedHashRate >= 1e9) {
      return (estimatedHashRate / 1e9).toFixed(2) + ' GH/s';
    } else if (estimatedHashRate >= 1e6) {
      return (estimatedHashRate / 1e6).toFixed(2) + ' MH/s';
    } else if (estimatedHashRate >= 1e3) {
      return (estimatedHashRate / 1e3).toFixed(2) + ' KH/s';
    } else {
      return estimatedHashRate.toFixed(2) + ' H/s';
    }
  }
}

module.exports = {
  BlockchainMiner,
  MiningPool
};