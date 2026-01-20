// DeFi routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const db = require('../models/index');

// DeFi Pool အသစ် ဖန်တီးရန်
router.post('/pools/create', authenticate, [
  body('name').notEmpty().withMessage('Pool name ဖြည့်ရန်'),
  body('token_a_id').isInt().withMessage('Token A ID ဖြည့်ရန်'),
  body('token_b_id').isInt().withMessage('Token B ID ဖြည့်ရန်'),
  body('apr').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { name, contract_address, token_a_id, token_b_id, apr = 0 } = req.body;
    
    // Tokens ရှိမရှိ စစ်ဆေးခြင်း
    const [tokenA, tokenB] = await Promise.all([
      db.query('SELECT * FROM tokens WHERE id = ?', [token_a_id]),
      db.query('SELECT * FROM tokens WHERE id = ?', [token_b_id])
    ]);
    
    if (tokenA.length === 0 || tokenB.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token မတွေ့ပါ။' 
      });
    }
    
    // Pool ဖန်တီးခြင်း
    const result = await db.execute(
      `INSERT INTO defi_pools 
       (name, contract_address, token_a_id, token_b_id, apr) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, contract_address || null, token_a_id, token_b_id, apr]
    );
    
    res.status(201).json({
      success: true,
      message: 'DeFi pool အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။',
      pool: {
        id: result.insertId,
        name,
        token_a: tokenA[0].symbol,
        token_b: tokenB[0].symbol,
        apr
      }
    });
    
  } catch (error) {
    console.error('Create pool error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// DeFi Pools အားလုံး ကြည့်ရန်
router.get('/pools', authenticate, async (req, res) => {
  try {
    const pools = await db.query(
      `SELECT p.*, 
              ta.symbol as token_a_symbol, 
              tb.symbol as token_b_symbol 
       FROM defi_pools p 
       JOIN tokens ta ON p.token_a_id = ta.id 
       JOIN tokens tb ON p.token_b_id = tb.id 
       ORDER BY p.total_liquidity DESC`
    );
    
    res.json({
      success: true,
      pools,
      count: pools.length
    });
    
  } catch (error) {
    console.error('Get pools error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Liquidity ထည့်သွင်းခြင်း
router.post('/pools/:id/add-liquidity', authenticate, [
  body('amount_a').isFloat({ gt: 0 }).withMessage('Amount A ဖြည့်ရန်'),
  body('amount_b').isFloat({ gt: 0 }).withMessage('Amount B ဖြည့်ရန်')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { id } = req.params;
    const { amount_a, amount_b } = req.body;
    
    // Pool ရှိမရှိ စစ်ဆေးခြင်း
    const pools = await db.query('SELECT * FROM defi_pools WHERE id = ?', [id]);
    if (pools.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pool မတွေ့ပါ။' 
      });
    }
    
    const pool = pools[0];
    const totalLiquidity = parseFloat(pool.total_liquidity || 0) + 
                          parseFloat(amount_a) + parseFloat(amount_b);
    
    // Liquidity update
    await db.execute(
      'UPDATE defi_pools SET total_liquidity = ? WHERE id = ?',
      [totalLiquidity, id]
    );
    
    res.json({
      success: true,
      message: 'Liquidity အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။',
      pool: {
        id: pool.id,
        name: pool.name,
        total_liquidity: totalLiquidity
      }
    });
    
  } catch (error) {
    console.error('Add liquidity error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// APR update (Admin only)
router.put('/pools/:id/apr', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin permission လိုအပ်ပါသည်။' 
      });
    }
    
    const { id } = req.params;
    const { apr } = req.body;
    
    if (apr === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'APR ဖြည့်ရန်' 
      });
    }
    
    await db.execute(
      'UPDATE defi_pools SET apr = ? WHERE id = ?',
      [parseFloat(apr), id]
    );
    
    res.json({
      success: true,
      message: 'APR အောင်မြင်စွာ update လုပ်ပြီးပါပြီ။'
    });
    
  } catch (error) {
    console.error('Update APR error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;