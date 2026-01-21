// P2P Network Routes
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const P2PNode = require('../p2p/peer');
const NetworkManager = require('../p2p/network-manager');

// Initialize P2P node
const p2pNode = new P2PNode(process.env.P2P_PORT || 5002);

// Start P2P network
router.post('/start', authenticate, async (req, res) => {
  try {
    p2pNode.start();
    
    res.json({
      success: true,
      message: 'P2P network started',
      port: p2pNode.port,
      peerId: p2pNode.peerId
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Connect to peer
router.post('/connect', authenticate, async (req, res) => {
  try {
    const { host, port } = req.body;
    
    if (!host || !port) {
      return res.status(400).json({ 
        success: false, 
        message: 'Host and port required' 
      });
    }
    
    p2pNode.connectToPeer(host, port);
    
    res.json({
      success: true,
      message: `Connecting to peer at ${host}:${port}`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get peer list
router.get('/peers', authenticate, async (req, res) => {
  try {
    const peers = p2pNode.getPeerList();
    
    res.json({
      success: true,
      peers: peers,
      count: peers.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get network stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await NetworkManager.getNetworkStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Discover peers
router.get('/discover', authenticate, async (req, res) => {
  try {
    const peers = await NetworkManager.discoverPeers(p2pNode.peerId);
    
    res.json({
      success: true,
      peers: peers,
      count: peers.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Broadcast message
router.post('/broadcast', authenticate, async (req, res) => {
  try {
    const { messageType, data } = req.body;
    
    if (!messageType || !data) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message type and data required' 
      });
    }
    
    p2pNode.broadcast({
      type: messageType,
      data: data
    });
    
    res.json({
      success: true,
      message: `Message broadcasted to network`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get node info
router.get('/node-info', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      nodeInfo: {
        peerId: p2pNode.peerId,
        port: p2pNode.port,
        peerCount: p2pNode.getPeerCount(),
        isRunning: !!p2pNode.server
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