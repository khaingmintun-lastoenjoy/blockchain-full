// Token routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, isAdmin } = require('../middleware/auth');
const db = require('../models/index');

// Token အသစ် ဖန်တီးရန်
router.post('/create', authenticate, [
  body('name').notEmpty().withMessage('Token name ဖြည့်ရန်'),
  body('symbol').notEmpty().withMessage('Token symbol ဖြည့်ရန်'),
  body('total_supply').isFloat({ gt: 0 }).withMessage('Total supply ဖြည့်ရန်'),
  body('decimals').optional().isInt({ min: 0, max: 18 }),
  body('type').isIn(['native', 'erc20', 'erc721', 'erc1155']).withMessage('Valid type ဖြည့်ရန်')
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
      name, 
      symbol, 
      contract_address = null, 
      total_supply, 
      decimals = 18, 
      type = 'erc20' 
    } = req.body;
    
    // Symbol ရှိပြီးသား စစ်ဆေးခြင်း
    const existingToken = await db.query(
      'SELECT * FROM tokens WHERE symbol = ?',
      [symbol]
    );
    
    if (existingToken.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token symbol ရှိပြီးသားဖြစ်နေပါသည်။' 
      });
    }
    
    // Token ဖန်တီးခြင်း
    const result = await db.execute(
      `INSERT INTO tokens 
       (name, symbol, contract_address, total_supply, decimals, type, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, symbol, contract_address, total_supply, decimals, type, req.user.id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Token အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။',
      token: {
        id: result.insertId,
        name,
        symbol,
        contract_address,
        total_supply,
        decimals,
        type
      }
    });
    
  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Token အားလုံး ကြည့်ရန်
router.get('/list', authenticate, async (req, res) => {
  try {
    const { type, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM tokens';
    const params = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const tokens = await db.query(query, params);
    
    res.json({
      success: true,
      tokens,
      count: tokens.length
    });
    
  } catch (error) {
    console.error('List tokens error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Token by symbol ကြည့်ရန်
router.get('/:symbol', authenticate, async (req, res) => {
  try {
    const { symbol } = req.params;
    const tokens = await db.query(
      'SELECT * FROM tokens WHERE symbol = ?',
      [symbol]
    );
    
    if (tokens.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Token မတွေ့ပါ။' 
      });
    }
    
    res.json({
      success: true,
      token: tokens[0]
    });
    
  } catch (error) {
    console.error('Get token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Token metadata update (Admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contract_address, verified } = req.body;
    
    const updateFields = [];
    const params = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }
    
    if (contract_address !== undefined) {
      updateFields.push('contract_address = ?');
      params.push(contract_address);
    }
    
    if (verified !== undefined) {
      updateFields.push('verified = ?');
      params.push(verified);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Update field များ ဖြည့်ရန်' 
      });
    }
    
    params.push(id);
    
    await db.execute(
      `UPDATE tokens SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    res.json({
      success: true,
      message: 'Token အောင်မြင်စွာ update လုပ်ပြီးပါပြီ။'
    });
    
  } catch (error) {
    console.error('Update token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;