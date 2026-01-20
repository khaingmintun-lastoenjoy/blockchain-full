// Wallet routes
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// Wallet အသစ် ဖန်တီးရန်
router.post('/create', authenticate, async (req, res) => {
  try {
    const { network = 'mainnet' } = req.body;
    const wallet = await Wallet.create(req.user.id, network);
    
    res.status(201).json({
      success: true,
      message: 'Wallet အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။',
      wallet: {
        address: wallet.address,
        network: wallet.network
      }
      // Note: Private key ကို security အရ ပြန်မပြပါ
    });
    
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// ကိုယ်ပိုင် wallet များ ကြည့်ရန်
router.get('/my-wallets', authenticate, async (req, res) => {
  try {
    const wallets = await Wallet.findByUserId(req.user.id);
    
    res.json({
      success: true,
      wallets: wallets.map(w => ({
        id: w.id,
        address: w.address,
        balance: w.balance,
        network: w.network,
        created_at: w.created_at
      }))
    });
    
  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Wallet balance ကြည့်ရန်
router.get('/balance/:address', authenticate, async (req, res) => {
  try {
    const { address } = req.params;
    const wallet = await Wallet.findByAddress(address);
    
    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Wallet မတွေ့ပါ။' 
      });
    }
    
    res.json({
      success: true,
      address: wallet.address,
      balance: wallet.balance,
      network: wallet.network
    });
    
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Wallet transactions ကြည့်ရန်
router.get('/transactions/:address', authenticate, async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const wallet = await Wallet.findByAddress(address);
    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Wallet မတွေ့ပါ။' 
      });
    }
    
    const transactions = await Transaction.findByAddress(
      address, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({
      success: true,
      address,
      transactions,
      count: transactions.length
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// အားလုံးသော wallets များ (admin only)
router.get('/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin permission လိုအပ်ပါသည်။' 
      });
    }
    
    const { limit = 100, offset = 0 } = req.query;
    const wallets = await Wallet.getAll(parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      wallets,
      count: wallets.length
    });
    
  } catch (error) {
    console.error('Get all wallets error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;