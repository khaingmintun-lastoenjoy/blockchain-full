// Main application file
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const transactionRoutes = require('./routes/transaction');
const blockchainRoutes = require('./routes/blockchain');
const tokenRoutes = require('./routes/token');
const contractRoutes = require('./routes/contract');
const defiRoutes = require('./routes/defi');
const bridgeRoutes = require('./routes/bridge');
const daoRoutes = require('./routes/dao');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/contract', contractRoutes);
app.use('/api/defi', defiRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/dao', daoRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Blockchain Backend API'
  });
});

// API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Blockchain System Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      wallet: '/api/wallet',
      transaction: '/api/transaction',
      blockchain: '/api/blockchain',
      token: '/api/token',
      contract: '/api/contract',
      defi: '/api/defi',
      bridge: '/api/bridge',
      dao: '/api/dao'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found.'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Blockchain Backend Server စတင်ပြီးပါပြီ။ Port: ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Documentation: http://localhost:${PORT}/`);
});