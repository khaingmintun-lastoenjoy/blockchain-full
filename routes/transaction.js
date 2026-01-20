// Transaction routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const crypto = require('crypto');

// Transaction အသစ် ဖန်တီးရန်
router.post('/send', authenticate, [
  body('from_address').notEmpty().withMessage('From address ဖြည့်ရန်'),
  body('to_address').notEmpty().withMessage('To address ဖြည့်ရန်'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount ဖြည့်ရန်'),
  body('token_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { from_address, to_address, amount, token_id = null } = req.body;
    
    // Sender wallet ရှိမရှိ စစ်ဆေးခြင်း
    const senderWallet = await Wallet.findByAddress(from_address);
    if (!senderWallet) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sender wallet မတွေ့ပါ။' 
      });
    }
    
    // Balance လုံလောက်မှု စစ်ဆေးခြင်း
    if (senderWallet.balance < parseFloat(amount)) {
      return res.status(400).json({ 
        success: false, 
        message: 'လက်ကျန်ငွေ မလုံလောက်ပါ။' 
      });
    }
    
    // Transaction hash ဖန်တီးခြင်း
    const hash = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Transaction ဖန်တီးခြင်း
    const tx = await Transaction.create({
      hash,
      from_address,
      to_address,
      amount: parseFloat(amount),
      token_id,
      status: 'pending'
    });
    
    // Balance update လုပ်ခြင်း
    await Wallet.updateBalance(from_address, -parseFloat(amount));
    await Wallet.updateBalance(to_address, parseFloat(amount));
    
    // Transaction status ကို confirmed အဖြစ် update
    await Transaction.updateStatus(hash, 'confirmed');
    
    res.status(201).json({
      success: true,
      message: 'Transaction အောင်မြင်ပါသည်။',
      transaction: {
        hash: tx.hash,
        from: tx.from_address,
        to: tx.to_address,
        amount: tx.amount,
        status: 'confirmed'
      }
    });
    
  } catch (error) {
    console.error('Send transaction error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Transaction by hash ကြည့်ရန်
router.get('/:hash', authenticate, async (req, res) => {
  try {
    const { hash } = req.params;
    const transaction = await Transaction.findByHash(hash);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction မတွေ့ပါ။' 
      });
    }
    
    res.json({
      success: true,
      transaction
    });
    
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Recent transactions ကြည့်ရန်
router.get('/recent', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const transactions = await Transaction.getRecent(parseInt(limit));
    
    res.json({
      success: true,
      transactions,
      count: transactions.length
    });
    
  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Pending transactions ကြည့်ရန်
router.get('/pending', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const transactions = await Transaction.findByStatus(
      'pending', 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({
      success: true,
      transactions,
      count: transactions.length
    });
    
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;