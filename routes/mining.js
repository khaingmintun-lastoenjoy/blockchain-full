// Mining Routes
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { BlockchainMiner, MiningPool } = require('../mining/miner');

// Initialize miner
let miner = null;
let miningPool = null;

// Start mining
router.post('/start', authenticate, async (req, res) => {
  try {
    const { minerAddress } = req.body;
    
    if (!minerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Miner address required' 
      });
    }
    
    if (miner && miner.isMining) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mining already in progress' 
      });
    }
    
    miner = new BlockchainMiner(minerAddress);
    await miner.startMining();
    
    res.json({
      success: true,
      message: 'Mining started',
      minerAddress: minerAddress
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Stop mining
router.post('/stop', authenticate, async (req, res) => {
  try {
    if (!miner || !miner.isMining) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mining is not running' 
      });
    }
    
    miner.stopMining();
    
    res.json({
      success: true,
      message: 'Mining stopped'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get miner stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    if (!miner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Miner not initialized' 
      });
    }
    
    const stats = await miner.getMinerStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get network mining stats
router.get('/network-stats', authenticate, async (req, res) => {
  try {
    if (!miner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Miner not initialized' 
      });
    }
    
    const stats = await miner.getNetworkMiningStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create mining pool
router.post('/pool/create', authenticate, async (req, res) => {
  try {
    const { poolAddress, feePercentage = 1.0 } = req.body;
    
    if (!poolAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pool address required' 
      });
    }
    
    miningPool = new MiningPool(poolAddress, feePercentage);
    
    res.json({
      success: true,
      message: 'Mining pool created',
      poolAddress: poolAddress,
      feePercentage: feePercentage
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Join mining pool
router.post('/pool/join', authenticate, async (req, res) => {
  try {
    const { minerAddress } = req.body;
    
    if (!miningPool) {
      return res.status(400).json({ 
        success: false, 
        message: 'No mining pool available' 
      });
    }
    
    if (!minerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Miner address required' 
      });
    }
    
    miningPool.registerMiner(minerAddress);
    
    res.json({
      success: true,
      message: 'Joined mining pool',
      minerAddress: minerAddress,
      poolAddress: miningPool.poolAddress
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get pool stats
router.get('/pool/stats', authenticate, async (req, res) => {
  try {
    if (!miningPool) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mining pool not found' 
      });
    }
    
    const stats = miningPool.getPoolStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Claim mining rewards
router.post('/claim-rewards', authenticate, async (req, res) => {
  try {
    const { minerAddress } = req.body;
    
    if (!miningPool) {
      return res.status(400).json({ 
        success: false, 
        message: 'No mining pool available' 
      });
    }
    
    if (!minerAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Miner address required' 
      });
    }
    
    const result = miningPool.claimRewards(minerAddress);
    
    res.json({
      success: true,
      message: 'Rewards claimed successfully',
      result: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;