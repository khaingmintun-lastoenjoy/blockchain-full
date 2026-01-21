// app.js - WITH IMPROVED PROCESS MANAGEMENT
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Track running services
let runningServices = {
  p2pNodes: [],
  miners: [],
  server: null
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import blockchain and initialize
const Blockchain = require('./models/Blockchain');

// Import all routes
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const transactionRoutes = require('./routes/transaction');
const blockchainRoutes = require('./routes/blockchain');
const tokenRoutes = require('./routes/token');
const contractRoutes = require('./routes/contract');
const defiRoutes = require('./routes/defi');
const bridgeRoutes = require('./routes/bridge');
const daoRoutes = require('./routes/dao');

// Import new enhanced routes
const p2pRoutes = require('./routes/p2p');
const miningRoutes = require('./routes/mining');
const explorerRoutes = require('./routes/explorer');
const networkRoutes = require('./routes/network');

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
app.use('/api/p2p', p2pRoutes);
app.use('/api/mining', miningRoutes);
app.use('/api/explorer', explorerRoutes);
app.use('/api/network', networkRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const blockchainStats = await Blockchain.getChainStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Complete Blockchain Backend API',
      version: '2.0.0',
      blockchain: blockchainStats,
      running_services: {
        p2p_nodes: runningServices.p2pNodes.length,
        miners: runningServices.miners.length,
        ports: runningServices.p2pNodes.map(n => n.port)
      },
      features: [
        'Authentication & Authorization',
        'Wallet Management',
        'Transaction System',
        'Blockchain Core',
        'Smart Contracts',
        'Token System (ERC20/ERC721/ERC1155)',
        'DeFi Protocols',
        'Cross-chain Bridge',
        'DAO Governance',
        'P2P Network',
        'Mining System',
        'Block Explorer',
        'Network Monitoring'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Complete Blockchain System Backend API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      wallet: '/api/wallet',
      transaction: '/api/transaction',
      blockchain: '/api/blockchain',
      token: '/api/token',
      contract: '/api/contract',
      defi: '/api/defi',
      bridge: '/api/bridge',
      dao: '/api/dao',
      p2p: '/api/p2p',
      mining: '/api/mining',
      explorer: '/api/explorer',
      network: '/api/network',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

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
    message: 'Endpoint not found.',
    requestedUrl: req.originalUrl
  });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Complete Blockchain Backend Server စတင်ပြီးပါပြီ။`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);

  // Initialize blockchain
  try {
    await Blockchain.initialize();
    console.log('✅ Blockchain initialized successfully');
  } catch (error) {
    console.error('❌ Blockchain initialization failed:', error);
  }

  // Start background services
  startBackgroundServices();
});

runningServices.server = server;

// Background services with better management
async function startBackgroundServices() {
  console.log('🔄 Background services များ စတင်နေသည်...');

  // Start P2P network (optional)
  // Start P2P network (optional)
  if (process.env.ENABLE_P2P === 'true') {
    try {
      const P2PNode = require('./p2p/peer');
      let p2pPort = parseInt(process.env.P2P_PORT || '5001');

      // Try to find available port
      p2pPort = await findAvailablePort(p2pPort);

      const p2pNode = new P2PNode(p2pPort);
      p2pNode.start();
      runningServices.p2pNodes.push({
        node: p2pNode,
        port: p2pPort
      });
      console.log(`🤝 P2P Network started on port ${p2pPort}`);
    } catch (error) {
      console.error('Failed to start P2P network:', error.message);
    }
  }

  // Start mining (optional)
  if (process.env.ENABLE_MINING === 'true' && process.env.MINER_ADDRESS) {
    try {
      const { BlockchainMiner } = require('./mining/miner');
      const miner = new BlockchainMiner(process.env.MINER_ADDRESS);
      miner.startMining().catch(console.error);
      runningServices.miners.push(miner);
      console.log(`⛏️  Mining started for address: ${process.env.MINER_ADDRESS}`);
    } catch (error) {
      console.error('Failed to start mining:', error.message);
    }
  }

  // Start bridge monitoring (optional)
  if (process.env.ENABLE_BRIDGE === 'true') {
    console.log(`🌉 Bridge system enabled`);
  }

  console.log('✅ Background services များ စတင်ပြီးပါပြီ။');
}

// Check if port is available - IMPROVED VERSION
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();

    server.unref(); // Allow process to exit if this is the only server

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use`);
        resolve(false);
      } else {
        console.log(`Error checking port ${port}:`, err.message);
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, '127.0.0.1');
  });
}

// Graceful shutdown function
async function gracefulShutdown() {
  console.log('\n🛑 Graceful shutdown စတင်နေသည်...');

  // Stop all miners
  if (runningServices.miners.length > 0) {
    console.log('Stopping miners...');
    runningServices.miners.forEach(miner => {
      try {
        if (miner.stopMining) miner.stopMining();
      } catch (error) {
        console.error('Error stopping miner:', error.message);
      }
    });
  }

  // Stop all P2P nodes
  if (runningServices.p2pNodes.length > 0) {
    console.log('Stopping P2P nodes...');
    runningServices.p2pNodes.forEach(service => {
      try {
        if (service.node && service.node.stop) service.node.stop();
      } catch (error) {
        console.error(`Error stopping P2P node on port ${service.port}:`, error.message);
      }
    });
  }

  // Close HTTP server
  if (runningServices.server) {
    console.log('Closing HTTP server...');
    runningServices.server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      console.log('Force exiting...');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;