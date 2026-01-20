// Bridge routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const db = require('../models/index');
const crypto = require('crypto');

// Cross-chain bridge transaction
router.post('/transfer', authenticate, [
  body('source_network').notEmpty().withMessage('Source network ဖြည့်ရန်'),
  body('target_network').notEmpty().withMessage('Target network ဖြည့်ရန်'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount ဖြည့်ရန်'),
  body('sender_address').notEmpty().withMessage('Sender address ဖြည့်ရန်'),
  body('receiver_address').notEmpty().withMessage('Receiver address ဖြည့်ရန်')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { 
      source_network, 
      target_network, 
      amount, 
      token_id = null,
      sender_address, 
      receiver_address 
    } = req.body;
    
    // Transaction hashes ဖန်တီးခြင်း
    const sourceTxHash = '0x' + crypto.randomBytes(32).toString('hex');
    const targetTxHash = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Bridge transaction ဖန်တီးခြင်း
    const result = await db.execute(
      `INSERT INTO bridge_transactions 
       (source_network, target_network, source_tx_hash, target_tx_hash, 
        amount, token_id, sender_address, receiver_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [source_network, target_network, sourceTxHash, targetTxHash, 
       amount, token_id, sender_address, receiver_address]
    );
    
    res.status(201).json({
      success: true,
      message: 'Bridge transfer စတင်ပြီးပါပြီ။',
      bridge_transaction: {
        id: result.insertId,
        source_network,
        target_network,
        source_tx_hash: sourceTxHash,
        target_tx_hash: targetTxHash,
        amount,
        status: 'pending'
      }
    });
    
  } catch (error) {
    console.error('Bridge transfer error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Bridge transactions ကြည့်ရန်
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { status, network, limit = 50, offset = 0 } = req.query;
    
    let query = `SELECT bt.*, t.symbol as token_symbol 
                 FROM bridge_transactions bt 
                 LEFT JOIN tokens t ON bt.token_id = t.id`;
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push('bt.status = ?');
      params.push(status);
    }
    
    if (network) {
      conditions.push('(bt.source_network = ? OR bt.target_network = ?)');
      params.push(network, network);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY bt.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const transactions = await db.query(query, params);
    
    res.json({
      success: true,
      transactions,
      count: transactions.length
    });
    
  } catch (error) {
    console.error('Get bridge transactions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Bridge transaction status update
router.put('/transactions/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, target_tx_hash } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status ဖြည့်ရန်' 
      });
    }
    
    const updateFields = ['status = ?'];
    const params = [status];
    
    if (target_tx_hash) {
      updateFields.push('target_tx_hash = ?');
      params.push(target_tx_hash);
    }
    
    params.push(id);
    
    await db.execute(
      `UPDATE bridge_transactions SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    res.json({
      success: true,
      message: 'Bridge transaction status အောင်မြင်စွာ update လုပ်ပြီးပါပြီ။'
    });
    
  } catch (error) {
    console.error('Update bridge status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Supported networks ကြည့်ရန်
router.get('/networks', authenticate, async (req, res) => {
  try {
    const networks = [
      { name: 'Ethereum Mainnet', chain_id: 1, native_token: 'ETH' },
      { name: 'Binance Smart Chain', chain_id: 56, native_token: 'BNB' },
      { name: 'Polygon', chain_id: 137, native_token: 'MATIC' },
      { name: 'Arbitrum', chain_id: 42161, native_token: 'ETH' },
      { name: 'Optimism', chain_id: 10, native_token: 'ETH' }
    ];
    
    res.json({
      success: true,
      networks
    });
    
  } catch (error) {
    console.error('Get networks error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;