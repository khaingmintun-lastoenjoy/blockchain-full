// DAO model ဖိုင်
const db = require('./index');

class Dao {
  // DAO အသစ် ဖန်တီးခြင်း
  static async create(daoData) {
    const {
      name,
      description = null,
      contract_address = null,
      governance_token_id,
      creator_id,
      voting_duration = 86400,
      min_quorum = 51.0
    } = daoData;
    
    const result = await db.execute(
      `INSERT INTO daos 
       (name, description, contract_address, governance_token_id, 
        creator_id, voting_duration, min_quorum) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, contract_address, governance_token_id, 
       creator_id, voting_duration, min_quorum]
    );
    
    return { id: result.insertId, ...daoData };
  }
  
  // ID ဖြင့် DAO ရှာဖွေခြင်း
  static async findById(id) {
    const daos = await db.query(
      `SELECT d.*, 
              t.symbol as governance_token_symbol,
              u.username as creator_name 
       FROM daos d 
       JOIN tokens t ON d.governance_token_id = t.id 
       JOIN users u ON d.creator_id = u.id 
       WHERE d.id = ?`,
      [id]
    );
    return daos[0];
  }
  
  // အားလုံးသော DAOs များ ရယူခြင်း
  static async getAll(limit = 100, offset = 0) {
    return await db.query(
      `SELECT d.*, 
              t.symbol as governance_token_symbol,
              u.username as creator_name 
       FROM daos d 
       JOIN tokens t ON d.governance_token_id = t.id 
       JOIN users u ON d.creator_id = u.id 
       ORDER BY d.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }
  
  // Creator ဖြင့် DAOs များ ရယူခြင်း
  static async findByCreator(creatorId, limit = 100, offset = 0) {
    return await db.query(
      `SELECT d.*, 
              t.symbol as governance_token_symbol,
              u.username as creator_name 
       FROM daos d 
       JOIN tokens t ON d.governance_token_id = t.id 
       JOIN users u ON d.creator_id = u.id 
       WHERE d.creator_id = ? 
       ORDER BY d.created_at DESC 
       LIMIT ? OFFSET ?`,
      [creatorId, limit, offset]
    );
  }
  
  // DAO update လုပ်ခြင်း
  static async update(id, updateData) {
    const updateFields = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    }
    
    if (updateFields.length === 0) return false;
    
    params.push(id);
    
    await db.execute(
      `UPDATE daos SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    return true;
  }
  
  // Proposal အသစ် ဖန်တီးခြင်း
  static async createProposal(proposalData) {
    const {
      dao_id,
      title,
      description = null,
      proposer_id,
      status = 'pending'
    } = proposalData;
    
    const result = await db.execute(
      `INSERT INTO dao_proposals 
       (dao_id, title, description, proposer_id, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [dao_id, title, description, proposer_id, status]
    );
    
    return { id: result.insertId, ...proposalData };
  }
  
  // DAO proposals များ ရယူခြင်း
  static async getProposals(daoId, status = null, limit = 50, offset = 0) {
    let query = `
      SELECT p.*, u.username as proposer_name 
      FROM dao_proposals p 
      JOIN users u ON p.proposer_id = u.id 
      WHERE p.dao_id = ?
    `;
    
    const params = [daoId];
    
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await db.query(query, params);
  }
  
  // Proposal by ID
  static async getProposalById(proposalId) {
    const proposals = await db.query(
      `SELECT p.*, u.username as proposer_name, d.name as dao_name 
       FROM dao_proposals p 
       JOIN users u ON p.proposer_id = u.id 
       JOIN daos d ON p.dao_id = d.id 
       WHERE p.id = ?`,
      [proposalId]
    );
    return proposals[0];
  }
  
  // Proposal status update
  static async updateProposalStatus(proposalId, status) {
    await db.execute(
      'UPDATE dao_proposals SET status = ? WHERE id = ?',
      [status, proposalId]
    );
  }
  
  // Vote on proposal
  static async addVote(proposalId, voteType) {
    const field = voteType === 'for' ? 'votes_for' : 'votes_against';
    await db.execute(
      `UPDATE dao_proposals SET ${field} = ${field} + 1 WHERE id = ?`,
      [proposalId]
    );
  }
  
  // DAO statistics
  static async getStatistics() {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_daos,
        COUNT(DISTINCT creator_id) as unique_creators,
        AVG(voting_duration) as avg_voting_duration,
        AVG(min_quorum) as avg_min_quorum
      FROM daos
    `);
    return stats[0];
  }
  
  // Active proposals count
  static async getActiveProposalsCount() {
    const [result] = await db.query(`
      SELECT COUNT(*) as count 
      FROM dao_proposals 
      WHERE status = 'active'
    `);
    return result.count;
  }
}

module.exports = Dao;