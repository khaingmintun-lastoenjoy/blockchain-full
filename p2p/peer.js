// P2P Network Node ဖိုင် - WITH PROPER CLEANUP
const WebSocket = require('ws');
const crypto = require('crypto');
const Blockchain = require('../models/Blockchain');

class P2PNode {
  constructor(port) {
    this.port = port || 5001;
    this.peers = new Map();
    this.server = null;
    this.peerId = crypto.randomBytes(16).toString('hex');
    this.messageHandlers = new Map();
    this.blockchain = Blockchain;
    this.intervals = [];
    this.timeouts = [];

    // Register message handlers
    this.registerHandlers();
  }

  // Start P2P server
  start() {
    try {
      this.server = new WebSocket.Server({ port: this.port });

      this.server.on('connection', (ws, req) => {
        console.log(`New connection from ${req.socket.remoteAddress}`);
        this.handleConnection(ws);
      });

      this.server.on('error', (error) => {
        console.error('P2P server error:', error.message);
      });

      console.log(`P2P node started on port ${this.port}, ID: ${this.peerId}`);

      // Initialize blockchain
      this.blockchain.initialize().catch(console.error);

      // Broadcast peer discovery
      const pingInterval = setInterval(() => {
        this.broadcast({
          type: 'ping',
          data: { peerId: this.peerId, timestamp: Date.now() }
        });
      }, 30000);

      this.intervals.push(pingInterval);

      return true;
    } catch (error) {
      console.error(`Failed to start P2P node on port ${this.port}:`, error.message);
      return false;
    }
  }

  // Stop P2P server
  stop() {
    console.log(`Stopping P2P node on port ${this.port}...`);

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];

    // Close all peer connections
    this.peers.forEach((ws, peerId) => {
      try {
        ws.close();
      } catch (error) {
        console.error(`Error closing connection to ${peerId}:`, error.message);
      }
    });
    this.peers.clear();

    // Close server
    if (this.server) {
      try {
        this.server.close();
        console.log(`P2P server on port ${this.port} stopped`);
      } catch (error) {
        console.error(`Error closing P2P server:`, error.message);
      }
      this.server = null;
    }
  }

  // Handle new connection
  handleConnection(ws) {
    const peerId = crypto.randomBytes(16).toString('hex');

    ws.peerId = peerId;
    ws.connectedSince = Date.now();
    this.peers.set(peerId, ws);

    // Send welcome message
    this.sendToPeer(peerId, {
      type: 'welcome',
      data: {
        peerId: this.peerId,
        message: 'Connected to blockchain network',
        timestamp: Date.now()
      }
    });

    // Request chain from peer after 2 seconds
    const timeout = setTimeout(() => {
      this.sendToPeer(peerId, {
        type: 'get_blocks',
        data: { from: 0, limit: 10 }
      });
    }, 2000);
    this.timeouts.push(timeout);

    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message, peerId);
      } catch (error) {
        console.error('Message parsing error:', error.message);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`Peer ${peerId} disconnected`);
      this.peers.delete(peerId);
    });

    ws.on('error', (error) => {
      console.error(`Peer ${peerId} error:`, error.message);
      this.peers.delete(peerId);
    });
  }

  // Connect to another peer
  connectToPeer(host, port) {
    // Don't connect to self
    if (port === this.port) {
      return;
    }

    const url = `ws://${host}:${port}`;

    // Check if already connected to this port
    const alreadyConnected = Array.from(this.peers.values()).some(ws => {
      const addr = this.getPeerAddress(ws.peerId);
      return addr && addr.port === port;
    });

    if (alreadyConnected) {
      return;
    }

    const ws = new WebSocket(url);

    ws.on('open', () => {
      console.log(`Connected to peer at ${url}`);
      this.handleConnection(ws);
    });

    ws.on('error', (error) => {
      // Don't log ECONNREFUSED errors
      if (!error.message.includes('ECONNREFUSED') &&
        !error.message.includes('EHOSTUNREACH')) {
        console.error(`Failed to connect to ${url}:`, error.message);
      }
    });

    // Set timeout
    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      }
    }, 5000);
    this.timeouts.push(timeout);
  }

  // Register message handlers
  registerHandlers() {
    this.messageHandlers.set('ping', this.handlePing.bind(this));
    this.messageHandlers.set('pong', this.handlePong.bind(this));
    this.messageHandlers.set('welcome', this.handleWelcome.bind(this)); // Added welcome handler
    this.messageHandlers.set('get_blocks', this.handleGetBlocks.bind(this));
    this.messageHandlers.set('blocks', this.handleBlocks.bind(this));
    this.messageHandlers.set('new_transaction', this.handleNewTransaction.bind(this));
    this.messageHandlers.set('new_block', this.handleNewBlock.bind(this));
    this.messageHandlers.set('get_peers', this.handleGetPeers.bind(this));
    this.messageHandlers.set('peers', this.handlePeers.bind(this));
    this.messageHandlers.set('error', this.handleError.bind(this)); // Added error handler
  }

  // Handle incoming messages
  async handleMessage(message, peerId) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      await handler(message.data, peerId);
    } else {
      console.log(`Unknown message type: ${message.type}`, message);
    }
  }

  // Ping handler
  handlePing(data, peerId) {
    this.sendToPeer(peerId, {
      type: 'pong',
      data: {
        peerId: this.peerId,
        timestamp: Date.now(),
        originalTimestamp: data.timestamp
      }
    });
  }

  // Pong handler
  handlePong(data) {
    const latency = Date.now() - data.originalTimestamp;
    console.log(`Ping from ${data.peerId}: ${latency}ms`);
  }

  // Welcome handler - ADDED
  handleWelcome(data, peerId) {
    console.log(`Welcome from ${data.peerId}: ${data.message}`);
  }

  // Error handler - ADDED
  handleError(data, peerId) {
    console.error(`Error from ${peerId}:`, data.message);
  }

  // Get blocks handler
  async handleGetBlocks(data, peerId) {
    const fromBlock = data.from || 0;
    const limit = data.limit || 10;

    try {
      // Use the getBlocks method from Blockchain class
      const blocks = await this.blockchain.getBlocks(fromBlock, limit);

      this.sendToPeer(peerId, {
        type: 'blocks',
        data: {
          blocks: blocks,
          from: fromBlock,
          count: blocks.length,
          peerId: this.peerId
        }
      });
    } catch (error) {
      console.error('Error getting blocks:', error);
      this.sendToPeer(peerId, {
        type: 'error',
        data: {
          message: 'Failed to get blocks',
          error: error.message
        }
      });
    }
  }

  // Blocks handler - FIXED VERSION
  async handleBlocks(data, peerId) {
    console.log(`Received ${data.blocks ? data.blocks.length : 0} blocks from peer ${data.peerId || 'unknown'}`);

    if (!data.blocks || !Array.isArray(data.blocks)) {
      console.error('Invalid blocks data received');
      return;
    }

    try {
      // Validate and add blocks to chain
      for (const block of data.blocks) {
        try {
          // Skip if block already exists
          const existingBlock = await this.blockchain.getBlockByNumber(block.block_number);
          if (!existingBlock) {
            console.log(`Adding block #${block.block_number} from peer`);
            await this.blockchain.addBlock(block);
          } else {
            console.log(`Block #${block.block_number} already exists`);
          }
        } catch (blockError) {
          console.error(`Error adding block #${block.block_number}:`, blockError.message);
          // Continue with next block instead of stopping
        }
      }
    } catch (error) {
      console.error('Error in handleBlocks:', error.message);
    }
  }

  // New transaction handler
  async handleNewTransaction(data, peerId) {
    if (!data.transaction) {
      console.error('Invalid transaction data received');
      return;
    }

    console.log(`New transaction from peer ${peerId}: ${data.transaction.hash}`);

    try {
      // Validate transaction
      const isValid = await this.blockchain.validateTransaction(data.transaction);
      if (isValid) {
        // Add to mempool
        await this.blockchain.addTransaction(data.transaction);

        console.log(`Transaction ${data.transaction.hash} added to mempool`);

        // Broadcast to other peers
        this.broadcast({
          type: 'new_transaction',
          data: {
            transaction: data.transaction,
            peerId: this.peerId
          }
        }, [peerId]); // Exclude sender
      } else {
        console.log(`Transaction ${data.transaction.hash} validation failed`);
      }
    } catch (error) {
      console.error('Transaction validation error:', error.message);
    }
  }

  // New block handler - FIXED VERSION
  async handleNewBlock(data, peerId) {
    if (!data.block) {
      console.error('Invalid block data received');
      return;
    }

    console.log(`New block from peer ${peerId}: ${data.block.hash}`);

    try {
      // Validate block
      const isValid = await this.blockchain.validateBlock(data.block);
      if (isValid) {
        // Add to chain
        await this.blockchain.addBlock(data.block);

        console.log(`Block ${data.block.hash} added to chain`);

        // Broadcast to other peers
        this.broadcast({
          type: 'new_block',
          data: {
            block: data.block,
            peerId: this.peerId
          }
        }, [peerId]); // Exclude sender
      } else {
        console.log(`Block ${data.block.hash} validation failed`);
      }
    } catch (error) {
      console.error('Block validation error:', error.message);
    }
  }

  // Get peers handler
  handleGetPeers(data, peerId) {
    const peerList = Array.from(this.peers.keys())
      .filter(id => id !== peerId)
      .map(id => {
        const ws = this.peers.get(id);
        return {
          peerId: id,
          address: this.getPeerAddress(id),
          connectedSince: ws.connectedSince || Date.now()
        };
      });

    this.sendToPeer(peerId, {
      type: 'peers',
      data: {
        peers: peerList,
        peerId: this.peerId
      }
    });
  }

  // Peers handler
  handlePeers(data) {
    console.log(`Received ${data.peers ? data.peers.length : 0} peers from network`);

    if (!data.peers || !Array.isArray(data.peers)) {
      return;
    }

    // Connect to new peers
    for (const peer of data.peers) {
      if (!this.peers.has(peer.peerId) && peer.address && peer.address.host) {
        console.log(`Connecting to new peer: ${peer.address.host}:${peer.address.port}`);
        this.connectToPeer(peer.address.host, peer.address.port);
      }
    }
  }

  // Send message to specific peer
  sendToPeer(peerId, message) {
    const ws = this.peers.get(peerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to ${peerId}:`, error);
      }
    }
  }

  // Broadcast message to all peers
  broadcast(message, exclude = []) {
    const messageStr = JSON.stringify(message);

    for (const [peerId, ws] of this.peers.entries()) {
      if (!exclude.includes(peerId) && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error(`Error broadcasting to ${peerId}:`, error);
        }
      }
    }
  }

  // Get peer address
  getPeerAddress(peerId) {
    const ws = this.peers.get(peerId);
    if (ws && ws._socket && ws._socket.remoteAddress) {
      return {
        host: ws._socket.remoteAddress,
        port: ws._socket.remotePort
      };
    }
    return null;
  }

  // Get peer count
  getPeerCount() {
    return this.peers.size;
  }

  // Get peer list
  getPeerList() {
    return Array.from(this.peers.entries()).map(([peerId, ws]) => ({
      peerId,
      address: this.getPeerAddress(peerId),
      connectedSince: ws.connectedSince || Date.now()
    }));
  }

  // Broadcast transaction
  async broadcastTransaction(transaction) {
    this.broadcast({
      type: 'new_transaction',
      data: {
        transaction: transaction,
        peerId: this.peerId
      }
    });
  }

  // Broadcast block
  async broadcastBlock(block) {
    this.broadcast({
      type: 'new_block',
      data: {
        block: block,
        peerId: this.peerId
      }
    });
  }

  // Get node info
  async getNodeInfo() {
    const latestBlock = await this.blockchain.getLatestBlock();
    return {
      peerId: this.peerId,
      port: this.port,
      peerCount: this.getPeerCount(),
      isRunning: !!this.server,
      blockchainHeight: latestBlock ? latestBlock.block_number : 0
    };
  }

  // Stop P2P server
  stop() {
    if (this.server) {
      this.server.close();
      console.log('P2P server stopped');
    }
  }
}

module.exports = P2PNode;