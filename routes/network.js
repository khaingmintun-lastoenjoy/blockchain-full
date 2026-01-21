// Network Monitoring Routes
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../models/index');

// Get network status
router.get('/status', authenticate, async (req, res) => {
  try {
    // Get blockchain status
    const [blockCount] = await db.query('SELECT COUNT(*) as count FROM blocks');
    const [txCount] = await db.query('SELECT COUNT(*) as count FROM transactions');
    const [pendingTxCount] = await db.query(
      "SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'"
    );
    
    // Get node statistics
    const [nodeStats] = await db.query(
      'SELECT * FROM node_statistics ORDER BY created_at DESC LIMIT 1'
    );
    
    // Get peer statistics
    const [peerStats] = await db.query(`
      SELECT 
        COUNT(*) as total_peers,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_peers,
        AVG(TIMESTAMPDIFF(SECOND, created_at, NOW())) as avg_age_seconds
      FROM network_peers
    `);
    
    res.json({
      success: true,
      networkStatus: {
        blockchain: {
          blockHeight: blockCount.count - 1,
          totalBlocks: blockCount.count,
          totalTransactions: txCount.count,
          pendingTransactions: pendingTxCount.count,
          synced: true // Would check if synced with network
        },
        node: nodeStats || {
          peerCount: 0,
          blockHeight: 0,
          mempoolSize: 0,
          uptime: 0
        },
        peers: peerStats || {
          totalPeers: 0,
          activePeers: 0,
          avgAge: 0
        },
        overallStatus: 'online',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get node statistics
router.get('/node-stats', authenticate, async (req, res) => {
  try {
    const stats = await db.query(
      'SELECT * FROM node_statistics ORDER BY created_at DESC LIMIT 100'
    );
    
    // Calculate averages
    const averages = {
      peerCount: stats.reduce((sum, s) => sum + (s.peer_count || 0), 0) / stats.length,
      mempoolSize: stats.reduce((sum, s) => sum + (s.mempool_size || 0), 0) / stats.length,
      memoryUsage: stats.reduce((sum, s) => sum + (s.memory_usage_mb || 0), 0) / stats.length,
      cpuUsage: stats.reduce((sum, s) => sum + (s.cpu_usage_percent || 0), 0) / stats.length
    };
    
    res.json({
      success: true,
      stats: stats,
      averages: averages,
      count: stats.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get network peers
router.get('/peers', authenticate, async (req, res) => {
  try {
    const { activeOnly = false } = req.query;
    
    let query = 'SELECT * FROM network_peers';
    if (activeOnly) {
      query += ' WHERE is_active = true';
    }
    query += ' ORDER BY last_seen DESC';
    
    const peers = await db.query(query);
    
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

// Get network latency
router.get('/latency', authenticate, async (req, res) => {
  try {
    // This would typically ping all peers and measure latency
    // For now, return mock data
    
    const latencyData = [
      { peer: 'peer1', latency: 45, status: 'online' },
      { peer: 'peer2', latency: 78, status: 'online' },
      { peer: 'peer3', latency: 120, status: 'slow' },
      { peer: 'peer4', latency: 0, status: 'offline' }
    ];
    
    const averageLatency = latencyData
      .filter(p => p.status === 'online')
      .reduce((sum, p) => sum + p.latency, 0) / 
      latencyData.filter(p => p.status === 'online').length || 0;
    
    res.json({
      success: true,
      latency: latencyData,
      averageLatency: averageLatency.toFixed(2),
      networkHealth: averageLatency < 100 ? 'good' : averageLatency < 200 ? 'fair' : 'poor'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get network traffic
router.get('/traffic', authenticate, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const traffic = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
        COUNT(*) as request_count,
        AVG(LENGTH(message_data)) as avg_message_size
      FROM p2p_messages
      WHERE created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')
      ORDER BY hour
    `, [parseInt(hours)]);
    
    const totalRequests = traffic.reduce((sum, t) => sum + t.request_count, 0);
    const totalTraffic = traffic.reduce((sum, t) => sum + (t.request_count * t.avg_message_size), 0);
    
    res.json({
      success: true,
      traffic: traffic,
      summary: {
        totalRequests: totalRequests,
        totalTraffic: (totalTraffic / 1024 / 1024).toFixed(2) + ' MB',
        requestsPerHour: (totalRequests / hours).toFixed(2),
        trafficPerHour: (totalTraffic / hours / 1024 / 1024).toFixed(2) + ' MB'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get system health
router.get('/system-health', authenticate, async (req, res) => {
  try {
    // Mock system health data
    // In production, this would collect real system metrics
    
    const healthData = {
      cpu: {
        usage: 45.2,
        cores: 4,
        load: [1.2, 1.0, 0.8]
      },
      memory: {
        total: 8192, // MB
        used: 4096,
        free: 4096,
        usagePercent: 50.0
      },
      disk: {
        total: 512000, // MB
        used: 256000,
        free: 256000,
        usagePercent: 50.0
      },
      network: {
        interfaces: ['eth0', 'lo'],
        rxBytes: 1024 * 1024 * 500, // 500 MB received
        txBytes: 1024 * 1024 * 250, // 250 MB sent
        connections: 42
      },
      uptime: {
        days: 7,
        hours: 12,
        minutes: 30,
        seconds: 45
      }
    };
    
    // Calculate overall health score
    const healthScore = (
      (100 - healthData.cpu.usage) * 0.3 +
      (100 - healthData.memory.usagePercent) * 0.3 +
      (100 - healthData.disk.usagePercent) * 0.2 +
      100 * 0.2 // Network weight
    );
    
    res.json({
      success: true,
      health: healthData,
      healthScore: healthScore.toFixed(1),
      status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'fair' : 'poor',
      recommendations: healthScore < 70 ? [
        'Consider adding more RAM',
        'Check for memory leaks',
        'Monitor disk space'
      ] : []
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;