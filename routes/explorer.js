// Block Explorer Routes
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Blockchain = require('../models/Blockchain');
const db = require('../models/index');

// Get blockchain explorer data
router.get('/blocks', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const data = await Blockchain.getBlockExplorerData(parseInt(limit), parseInt(page));
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get block details
router.get('/blocks/:blockNumber', authenticate, async (req, res) => {
  try {
    const { blockNumber } = req.params;
    
    const [block] = await db.query(
      `SELECT b.*, 
              COUNT(t.id) as transaction_count,
              GROUP_CONCAT(DISTINCT t.hash) as transaction_hashes
       FROM blocks b
       LEFT JOIN transactions t ON b.block_number = t.block_number
       WHERE b.block_number = ?
       GROUP BY b.id`,
      [blockNumber]
    );
    
    if (!block) {
      return res.status(404).json({ 
        success: false, 
        message: 'Block not found' 
      });
    }
    
    // Get block transactions
    const transactions = await db.query(
      `SELECT t.*, tok.symbol as token_symbol, tok.name as token_name
       FROM transactions t
       LEFT JOIN tokens tok ON t.token_id = tok.id
       WHERE t.block_number = ?
       ORDER BY t.created_at DESC`,
      [blockNumber]
    );
    
    res.json({
      success: true,
      block: block,
      transactions: transactions,
      transactionCount: transactions.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get transaction details
router.get('/transactions/:hash', authenticate, async (req, res) => {
  try {
    const { hash } = req.params;
    
    const [transaction] = await db.query(
      `SELECT t.*, 
              b.block_number, b.hash as block_hash, b.timestamp as block_timestamp,
              tok.symbol as token_symbol, tok.name as token_name, tok.decimals as token_decimals,
              u_from.username as from_username,
              u_to.username as to_username
       FROM transactions t
       LEFT JOIN blocks b ON t.block_number = b.block_number
       LEFT JOIN tokens tok ON t.token_id = tok.id
       LEFT JOIN wallets w_from ON t.from_address = w_from.address
       LEFT JOIN users u_from ON w_from.user_id = u_from.id
       LEFT JOIN wallets w_to ON t.to_address = w_to.address
       LEFT JOIN users u_to ON w_to.user_id = u_to.id
       WHERE t.hash = ?`,
      [hash]
    );
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }
    
    res.json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get address details
router.get('/address/:address', authenticate, async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get address info
    const [wallet] = await db.query(
      `SELECT w.*, u.username, u.email
       FROM wallets w
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.address = ?`,
      [address]
    );
    
    if (!wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Address not found' 
      });
    }
    
    // Get balance
    const balance = await Blockchain.getBalance(address);
    
    // Get transaction count
    const [txCount] = await db.query(
      `SELECT COUNT(*) as count 
       FROM transactions 
       WHERE from_address = ? OR to_address = ?`,
      [address, address]
    );
    
    // Get recent transactions
    const transactions = await db.query(
      `SELECT t.*, tok.symbol as token_symbol
       FROM transactions t
       LEFT JOIN tokens tok ON t.token_id = tok.id
       WHERE t.from_address = ? OR t.to_address = ?
       ORDER BY t.created_at DESC
       LIMIT 20`,
      [address, address]
    );
    
    // Get token balances
    const tokenBalances = await db.query(
      `SELECT tok.*, ut.balance
       FROM user_tokens ut
       JOIN tokens tok ON ut.token_id = tok.id
       WHERE ut.wallet_address = ?`,
      [address]
    );
    
    res.json({
      success: true,
      address: address,
      wallet: wallet,
      balance: balance,
      transactionCount: txCount.count,
      transactions: transactions,
      tokenBalances: tokenBalances
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Search blockchain
router.get('/search', authenticate, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query required' 
      });
    }
    
    const results = {
      blocks: [],
      transactions: [],
      addresses: [],
      tokens: []
    };
    
    // Search blocks
    if (!isNaN(query)) {
      // Search by block number
      const blocks = await db.query(
        'SELECT * FROM blocks WHERE block_number = ?',
        [parseInt(query)]
      );
      results.blocks = blocks;
    }
    
    // Search transactions
    if (query.startsWith('0x') && query.length === 66) {
      // Search by transaction hash
      const transactions = await db.query(
        'SELECT * FROM transactions WHERE hash = ?',
        [query]
      );
      results.transactions = transactions;
    }
    
    // Search addresses
    if (query.startsWith('0x') && query.length === 42) {
      // Search by address
      const wallets = await db.query(
        'SELECT * FROM wallets WHERE address = ?',
        [query]
      );
      results.addresses = wallets;
      
      // Also search transactions involving this address
      const addressTxs = await db.query(
        'SELECT * FROM transactions WHERE from_address = ? OR to_address = ? LIMIT 10',
        [query, query]
      );
      results.transactions.push(...addressTxs);
    }
    
    // Search tokens
    const tokens = await db.query(
      'SELECT * FROM tokens WHERE symbol LIKE ? OR name LIKE ?',
      [`%${query}%`, `%${query}%`]
    );
    results.tokens = tokens;
    
    // Search contracts
    const contracts = await db.query(
      'SELECT * FROM contracts WHERE address = ? OR name LIKE ?',
      [query, `%${query}%`]
    );
    results.contracts = contracts;
    
    res.json({
      success: true,
      query: query,
      results: results,
      totalResults: Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get blockchain statistics
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const stats = await Blockchain.getChainStats();
    
    // Additional statistics
    const [totalWallets] = await db.query('SELECT COUNT(*) as count FROM wallets');
    const [totalTokens] = await db.query('SELECT COUNT(*) as count FROM tokens');
    const [totalContracts] = await db.query('SELECT COUNT(*) as count FROM contracts');
    
    res.json({
      success: true,
      statistics: {
        ...stats,
        totalWallets: totalWallets.count,
        totalTokens: totalTokens.count,
        totalContracts: totalContracts.count,
        averageBlockTime: await Blockchain.getAverageBlockTime(),
        networkHashRate: '0', // Would be calculated
        activeMiners: 0 // Would be calculated
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;