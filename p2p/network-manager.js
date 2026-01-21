// P2P Network Manager ဖိုင်
const db = require('../models/index');
const NodeCache = require('node-cache');

class NetworkManager {
  constructor() {
    this.peers = new Map();
    this.nodeCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
    this.bootstraps = [
      'ws://localhost:5001',
      'ws://localhost:5002',
      'ws://localhost:5003'
    ];
  }
  
  // Peer မှတ်တမ်းထားခြင်း
  async registerPeer(peerData) {
    const { peerId, address, version, capabilities } = peerData;
    
    await db.execute(
      `INSERT INTO network_peers 
       (peer_id, address, version, capabilities, last_seen) 
       VALUES (?, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE 
       address = VALUES(address), 
       last_seen = NOW()`,
      [peerId, address, version, JSON.stringify(capabilities)]
    );
    
    // Cache ထဲတွင် သိမ်းခြင်း
    this.nodeCache.set(peerId, {
      ...peerData,
      lastSeen: Date.now(),
      isActive: true
    });
    
    return peerId;
  }
  
  // Active peers ရယူခြင်း
  async getActivePeers(limit = 50) {
    const cachedPeers = this.getAllCachedPeers();
    if (cachedPeers.length > 0) {
      return cachedPeers.slice(0, limit);
    }
    
    // Database မှ ရယူခြင်း
    const peers = await db.query(
      `SELECT * FROM network_peers 
       WHERE last_seen > DATE_SUB(NOW(), INTERVAL 10 MINUTE) 
       ORDER BY last_seen DESC 
       LIMIT ${limit}`,
      []
    );
    
    return peers.map(peer => ({
      ...peer,
      capabilities: JSON.parse(peer.capabilities || '[]')
    }));
  }
  
  // Cached peers ရယူခြင်း
  getAllCachedPeers() {
    const keys = this.nodeCache.keys();
    return keys.map(key => this.nodeCache.get(key)).filter(Boolean);
  }
  
  // Peer ကို update လုပ်ခြင်း
  async updatePeerStatus(peerId, status) {
    await db.execute(
      'UPDATE network_peers SET is_active = ?, last_seen = NOW() WHERE peer_id = ?',
      [status, peerId]
    );
    
    const cached = this.nodeCache.get(peerId);
    if (cached) {
      cached.isActive = status;
      cached.lastSeen = Date.now();
      this.nodeCache.set(peerId, cached);
    }
  }
  
  // Network statistics
  async getNetworkStats() {
    const [totalPeers] = await db.query('SELECT COUNT(*) as count FROM network_peers');
    const [activePeers] = await db.query(
      "SELECT COUNT(*) as count FROM network_peers WHERE is_active = true"
    );
    
    const cachedPeers = this.getAllCachedPeers();
    
    return {
      total_peers: totalPeers.count,
      active_peers: activePeers.count,
      cached_peers: cachedPeers.length,
      bootstrap_nodes: this.bootstraps.length,
      network_health: activePeers.count > 5 ? 'healthy' : 'unstable'
    };
  }
  
  // Peer discovery
  async discoverPeers(peerId) {
    const knownPeers = await this.getActivePeers(20);
    const recommendations = knownPeers
      .filter(peer => peer.peer_id !== peerId)
      .map(peer => ({
        peerId: peer.peer_id,
        address: peer.address,
        version: peer.version
      }));
    
    return recommendations;
  }
  
  // Network latency test
  async testLatency(peerId) {
    // This would typically involve sending ping messages
    // For now, return mock latency
    return {
      peerId,
      latency: Math.floor(Math.random() * 100) + 20, // 20-120ms
      timestamp: Date.now()
    };
  }
  
  // Broadcast message to network
  async broadcastToNetwork(messageType, data, excludePeers = []) {
    const activePeers = await this.getActivePeers(100);
    
    // Filter out excluded peers
    const targetPeers = activePeers.filter(
      peer => !excludePeers.includes(peer.peer_id)
    );
    
    // In a real implementation, this would send messages to each peer
    console.log(`Broadcasting ${messageType} to ${targetPeers.length} peers`);
    
    return {
      success: true,
      message: `Broadcasted to ${targetPeers.length} peers`,
      excluded: excludePeers.length
    };
  }
  
  // Cleanup inactive peers
  async cleanupInactivePeers() {
    const result = await db.execute(
      'DELETE FROM network_peers WHERE last_seen < DATE_SUB(NOW(), INTERVAL 1 DAY)'
    );
    
    // Clear cache for deleted peers
    const cachedKeys = this.nodeCache.keys();
    for (const key of cachedKeys) {
      const peer = this.nodeCache.get(key);
      if (peer && Date.now() - peer.lastSeen > 24 * 60 * 60 * 1000) {
        this.nodeCache.del(key);
      }
    }
    
    return {
      deleted: result.affectedRows,
      message: 'Cleaned up inactive peers'
    };
  }
}

module.exports = new NetworkManager();