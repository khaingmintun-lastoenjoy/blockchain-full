// DAO routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, isDaoMember } = require('../middleware/auth');
const db = require('../models/index');

// DAO အသစ် ဖန်တီးရန်
router.post('/create', authenticate, isDaoMember, [
  body('name').notEmpty().withMessage('DAO name ဖြည့်ရန်'),
  body('description').optional(),
  body('governance_token_id').isInt().withMessage('Governance token ID ဖြည့်ရန်')
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
      description, 
      contract_address, 
      governance_token_id,
      voting_duration = 86400,
      min_quorum = 51.0 
    } = req.body;
    
    // Governance token ရှိမရှိ စစ်ဆေးခြင်း
    const tokens = await db.query(
      'SELECT * FROM tokens WHERE id = ?',
      [governance_token_id]
    );
    
    if (tokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Governance token မတွေ့ပါ။' 
      });
    }
    
    // DAO ဖန်တီးခြင်း
    const result = await db.execute(
      `INSERT INTO daos 
       (name, description, contract_address, governance_token_id, 
        creator_id, voting_duration, min_quorum) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, contract_address || null, governance_token_id,
       req.user.id, voting_duration, min_quorum]
    );
    
    res.status(201).json({
      success: true,
      message: 'DAO အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။',
      dao: {
        id: result.insertId,
        name,
        description,
        governance_token: tokens[0].symbol,
        creator_id: req.user.id,
        voting_duration,
        min_quorum
      }
    });
    
  } catch (error) {
    console.error('Create DAO error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// DAO အားလုံး ကြည့်ရန်
router.get('/list', authenticate, async (req, res) => {
  try {
    const daos = await db.query(
      `SELECT d.*, 
              t.symbol as governance_token_symbol,
              u.username as creator_name 
       FROM daos d 
       JOIN tokens t ON d.governance_token_id = t.id 
       JOIN users u ON d.creator_id = u.id 
       ORDER BY d.created_at DESC`
    );
    
    res.json({
      success: true,
      daos,
      count: daos.length
    });
    
  } catch (error) {
    console.error('List DAOs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Proposal အသစ် ဖန်တီးရန်
router.post('/:daoId/proposals/create', authenticate, isDaoMember, [
  body('title').notEmpty().withMessage('Proposal title ဖြည့်ရန်'),
  body('description').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { daoId } = req.params;
    const { title, description } = req.body;
    
    // DAO ရှိမရှိ စစ်ဆေးခြင်း
    const daos = await db.query('SELECT * FROM daos WHERE id = ?', [daoId]);
    if (daos.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'DAO မတွေ့ပါ။' 
      });
    }
    
    // Proposal ဖန်တီးခြင်း
    const result = await db.execute(
      `INSERT INTO dao_proposals 
       (dao_id, title, description, proposer_id, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [daoId, title, description, req.user.id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Proposal အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။',
      proposal: {
        id: result.insertId,
        dao_id: daoId,
        title,
        status: 'pending'
      }
    });
    
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// DAO proposals ကြည့်ရန်
router.get('/:daoId/proposals', authenticate, async (req, res) => {
  try {
    const { daoId } = req.params;
    const { status } = req.query;
    
    let query = `SELECT p.*, u.username as proposer_name 
                 FROM dao_proposals p 
                 JOIN users u ON p.proposer_id = u.id 
                 WHERE p.dao_id = ?`;
    const params = [daoId];
    
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const proposals = await db.query(query, params);
    
    res.json({
      success: true,
      proposals,
      count: proposals.length
    });
    
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Vote on proposal
router.post('/proposals/:proposalId/vote', authenticate, isDaoMember, [
  body('vote').isIn(['for', 'against']).withMessage('Vote must be "for" or "against"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { proposalId } = req.params;
    const { vote } = req.body;
    
    // Proposal ရှိမရှိ စစ်ဆေးခြင်း
    const proposals = await db.query(
      'SELECT * FROM dao_proposals WHERE id = ?',
      [proposalId]
    );
    
    if (proposals.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proposal မတွေ့ပါ။' 
      });
    }
    
    const proposal = proposals[0];
    
    // Vote update
    const updateField = vote === 'for' ? 'votes_for' : 'votes_against';
    await db.execute(
      `UPDATE dao_proposals SET ${updateField} = ${updateField} + 1 WHERE id = ?`,
      [proposalId]
    );
    
    res.json({
      success: true,
      message: `Vote အောင်မြင်စွာ ${vote} ပေးပြီးပါပြီ။`
    });
    
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Proposal status update
router.put('/proposals/:proposalId/status', authenticate, isDaoMember, [
  body('status').isIn(['pending', 'active', 'passed', 'rejected', 'executed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { proposalId } = req.params;
    const { status } = req.body;
    
    await db.execute(
      'UPDATE dao_proposals SET status = ? WHERE id = ?',
      [status, proposalId]
    );
    
    res.json({
      success: true,
      message: 'Proposal status အောင်မြင်စွာ update လုပ်ပြီးပါပြီ။'
    });
    
  } catch (error) {
    console.error('Update proposal status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;