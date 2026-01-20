// Smart Contract routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const db = require('../models/index');

// Contract အသစ် ဖန်တီးရန်
router.post('/deploy', authenticate, [
  body('name').notEmpty().withMessage('Contract name ဖြည့်ရန်'),
  body('address').notEmpty().withMessage('Contract address ဖြည့်ရန်'),
  body('type').isIn(['defi', 'nft', 'dao', 'bridge', 'other']).withMessage('Valid type ဖြည့်ရန်')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { name, address, abi, bytecode, type = 'other' } = req.body;
    
    // Address ရှိပြီးသား စစ်ဆေးခြင်း
    const existingContract = await db.query(
      'SELECT * FROM contracts WHERE address = ?',
      [address]
    );
    
    if (existingContract.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contract address ရှိပြီးသားဖြစ်နေပါသည်။' 
      });
    }
    
    // Contract ဖန်တီးခြင်း
    const result = await db.execute(
      `INSERT INTO contracts 
       (name, address, abi, bytecode, creator_id, type) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, address, abi || null, bytecode || null, req.user.id, type]
    );
    
    res.status(201).json({
      success: true,
      message: 'Contract အောင်မြင်စွာ deploy လုပ်ပြီးပါပြီ။',
      contract: {
        id: result.insertId,
        name,
        address,
        type,
        verified: false
      }
    });
    
  } catch (error) {
    console.error('Deploy contract error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Verified contracts များ ကြည့်ရန်
router.get('/verified', authenticate, async (req, res) => {
  try {
    const contracts = await db.query(
      `SELECT c.*, u.username as creator_name 
       FROM contracts c 
       JOIN users u ON c.creator_id = u.id 
       WHERE c.verified = true 
       ORDER BY c.created_at DESC`
    );
    
    res.json({
      success: true,
      contracts,
      count: contracts.length
    });
    
  } catch (error) {
    console.error('Get verified contracts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Contract by address ကြည့်ရန်
router.get('/:address', authenticate, async (req, res) => {
  try {
    const { address } = req.params;
    const contracts = await db.query(
      `SELECT c.*, u.username as creator_name 
       FROM contracts c 
       JOIN users u ON c.creator_id = u.id 
       WHERE c.address = ?`,
      [address]
    );
    
    if (contracts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contract မတွေ့ပါ။' 
      });
    }
    
    res.json({
      success: true,
      contract: contracts[0]
    });
    
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Contract verify (Admin only)
router.post('/:id/verify', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin permission လိုအပ်ပါသည်။' 
      });
    }
    
    const { id } = req.params;
    
    await db.execute(
      'UPDATE contracts SET verified = true WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Contract အောင်မြင်စွာ verify လုပ်ပြီးပါပြီ။'
    });
    
  } catch (error) {
    console.error('Verify contract error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;