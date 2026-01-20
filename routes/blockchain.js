// Blockchain routes
const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const db = require('../models/index');
const crypto = require('crypto');

// Latest block ရယူခြင်း
router.get('/blocks/latest', authenticate, async (req, res) => {
  try {
    const blocks = await db.query(
      'SELECT * FROM blocks ORDER BY block_number DESC LIMIT 1'
    );
    
    res.json({
      success: true,
      block: blocks[0] || null
    });
    
  } catch (error) {
    console.error('Get latest block error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Block by number ရယူခြင်း
router.get('/blocks/:number', authenticate, async (req, res) => {
  try {
    const { number } = req.params;
    const blocks = await db.query(
      'SELECT * FROM blocks WHERE block_number = ?',
      [number]
    );
    
    if (blocks.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Block မတွေ့ပါ။' 
      });
    }
    
    res.json({
      success: true,
      block: blocks[0]
    });
    
  } catch (error) {
    console.error('Get block error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// New block ဖန်တီးခြင်း (Admin only)
router.post('/blocks', authenticate, isAdmin, async (req, res) => {
  try {
    const { miner_address = 'system', difficulty = 1.0 } = req.body;
    
    // Latest block ရယူခြင်း
    const latestBlocks = await db.query(
      'SELECT * FROM blocks ORDER BY block_number DESC LIMIT 1'
    );
    
    const latestBlock = latestBlocks[0];
    const blockNumber = latestBlock ? latestBlock.block_number + 1 : 0;
    const previousHash = latestBlock ? latestBlock.hash : null;
    
    // New block hash ဖန်တီးခြင်း
    const hash = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Block သိမ်းခြင်း
    await db.execute(
      `INSERT INTO blocks 
       (block_number, hash, previous_hash, miner_address, difficulty) 
       VALUES (?, ?, ?, ?, ?)`,
      [blockNumber, hash, previousHash, miner_address, difficulty]
    );
    
    res.status(201).json({
      success: true,
      message: 'Block အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။',
      block: {
        block_number: blockNumber,
        hash,
        previous_hash: previousHash,
        miner_address,
        difficulty
      }
    });
    
  } catch (error) {
    console.error('Create block error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Blockchain status ကြည့်ရန်
router.get('/status', authenticate, async (req, res) => {
  try {
    const [blockCount] = await db.query('SELECT COUNT(*) as count FROM blocks');
    const [txCount] = await db.query('SELECT COUNT(*) as count FROM transactions');
    const [walletCount] = await db.query('SELECT COUNT(*) as count FROM wallets');
    
    res.json({
      success: true,
      status: {
        total_blocks: blockCount.count,
        total_transactions: txCount.count,
        total_wallets: walletCount.count,
        network_status: 'active'
      }
    });
    
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;