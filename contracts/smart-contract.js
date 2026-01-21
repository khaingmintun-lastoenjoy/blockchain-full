// Smart Contract Base Class ဖိုင်
const crypto = require('crypto');
const db = require('../models/index');

class SmartContract {
  constructor(address, creator, bytecode, abi) {
    this.address = address;
    this.creator = creator;
    this.bytecode = bytecode;
    this.abi = abi;
    this.storage = new Map();
    this.events = [];
    this.balance = 0;
    this.nonce = 0;
  }
  
  // Contract deploy
  static async deploy(creator, bytecode, abi, initialStorage = {}) {
    const address = this.generateContractAddress(creator, Date.now());
    
    const contract = new SmartContract(address, creator, bytecode, abi);
    
    // Initialize storage
    for (const [key, value] of Object.entries(initialStorage)) {
      contract.storage.set(key, value);
    }
    
    // Save to database
    await db.execute(
      `INSERT INTO contracts 
       (address, creator_id, bytecode, abi, type, verified) 
       VALUES (?, ?, ?, ?, 'custom', false)`,
      [address, creator, bytecode, JSON.stringify(abi)]
    );
    
    return contract;
  }
  
  // Generate contract address
  static generateContractAddress(creator, nonce) {
    const data = `${creator}${nonce}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return '0x' + hash.substring(0, 40);
  }
  
  // Execute contract function
  async execute(sender, functionName, params = [], value = 0) {
    // Check if contract has enough balance
    if (value > 0) {
      // Transfer value to contract
      await this.transferToContract(sender, value);
    }
    
    // Find function in ABI
    const func = this.abi.find(
      item => item.type === 'function' && item.name === functionName
    );
    
    if (!func) {
      throw new Error(`Function ${functionName} not found in contract ABI`);
    }
    
    // Execute based on function type
    let result;
    switch (functionName) {
      case 'transfer':
        result = await this.executeTransfer(sender, params);
        break;
      case 'balanceOf':
        result = await this.executeBalanceOf(params);
        break;
      case 'approve':
        result = await this.executeApprove(sender, params);
        break;
      case 'mint':
        result = await this.executeMint(sender, params);
        break;
      case 'burn':
        result = await this.executeBurn(sender, params);
        break;
      default:
        result = await this.executeCustomFunction(func, sender, params);
    }
    
    // Emit event
    this.emitEvent(functionName, {
      sender,
      params,
      result,
      timestamp: Date.now()
    });
    
    // Save execution to database
    await this.saveExecution(functionName, sender, params, result);
    
    return result;
  }
  
  // Transfer tokens
  async executeTransfer(sender, params) {
    const [to, amount] = params;
    
    if (!to || !amount) {
      throw new Error('Invalid transfer parameters');
    }
    
    const senderKey = `balance_${sender}`;
    const receiverKey = `balance_${to}`;
    
    const senderBalance = parseFloat(this.storage.get(senderKey) || 0);
    
    if (senderBalance < amount) {
      throw new Error('Insufficient balance');
    }
    
    const receiverBalance = parseFloat(this.storage.get(receiverKey) || 0);
    
    this.storage.set(senderKey, senderBalance - amount);
    this.storage.set(receiverKey, receiverBalance + amount);
    
    return {
      success: true,
      from: sender,
      to: to,
      amount: amount,
      newSenderBalance: senderBalance - amount,
      newReceiverBalance: receiverBalance + amount
    };
  }
  
  // Check balance
  async executeBalanceOf(params) {
    const [address] = params;
    const balanceKey = `balance_${address}`;
    const balance = parseFloat(this.storage.get(balanceKey) || 0);
    
    return {
      address: address,
      balance: balance
    };
  }
  
  // Approve spender
  async executeApprove(sender, params) {
    const [spender, amount] = params;
    const allowanceKey = `allowance_${sender}_${spender}`;
    
    this.storage.set(allowanceKey, amount);
    
    return {
      success: true,
      owner: sender,
      spender: spender,
      amount: amount
    };
  }
  
  // Mint tokens
  async executeMint(sender, params) {
    // Check if sender has minting rights
    const isMinter = this.storage.get('minter') === sender;
    if (!isMinter) {
      throw new Error('Not authorized to mint');
    }
    
    const [to, amount] = params;
    const balanceKey = `balance_${to}`;
    const currentBalance = parseFloat(this.storage.get(balanceKey) || 0);
    
    // Increase total supply
    const totalSupply = parseFloat(this.storage.get('totalSupply') || 0);
    this.storage.set('totalSupply', totalSupply + amount);
    
    // Update balance
    this.storage.set(balanceKey, currentBalance + amount);
    
    return {
      success: true,
      to: to,
      amount: amount,
      newBalance: currentBalance + amount,
      newTotalSupply: totalSupply + amount
    };
  }
  
  // Burn tokens
  async executeBurn(sender, params) {
    const [amount] = params;
    const balanceKey = `balance_${sender}`;
    const currentBalance = parseFloat(this.storage.get(balanceKey) || 0);
    
    if (currentBalance < amount) {
      throw new Error('Insufficient balance to burn');
    }
    
    // Decrease total supply
    const totalSupply = parseFloat(this.storage.get('totalSupply') || 0);
    this.storage.set('totalSupply', totalSupply - amount);
    
    // Update balance
    this.storage.set(balanceKey, currentBalance - amount);
    
    return {
      success: true,
      from: sender,
      amount: amount,
      newBalance: currentBalance - amount,
      newTotalSupply: totalSupply - amount
    };
  }
  
  // Execute custom function
  async executeCustomFunction(func, sender, params) {
    // In a real implementation, this would execute EVM bytecode
    // For now, return a mock result
    return {
      success: true,
      function: func.name,
      sender: sender,
      params: params,
      result: 'Function executed successfully',
      gasUsed: 21000
    };
  }
  
  // Transfer value to contract
  async transferToContract(sender, amount) {
    // In a real implementation, this would transfer native tokens
    this.balance += amount;
    
    // Record transfer
    await db.execute(
      `INSERT INTO contract_transfers 
       (contract_address, sender, amount, transaction_hash) 
       VALUES (?, ?, ?, ?)`,
      [this.address, sender, amount, crypto.randomBytes(32).toString('hex')]
    );
    
    return true;
  }
  
  // Emit event
  emitEvent(eventName, data) {
    const event = {
      contract: this.address,
      event: eventName,
      data: data,
      timestamp: Date.now(),
      blockNumber: 0 // Would be set by blockchain
    };
    
    this.events.push(event);
    
    // Save event to database
    this.saveEvent(event).catch(console.error);
  }
  
  // Save event to database
  async saveEvent(event) {
    await db.execute(
      `INSERT INTO contract_events 
       (contract_address, event_name, event_data, block_number) 
       VALUES (?, ?, ?, ?)`,
      [event.contract, event.event, JSON.stringify(event.data), event.blockNumber]
    );
  }
  
  // Save execution to database
  async saveExecution(functionName, sender, params, result) {
    await db.execute(
      `INSERT INTO contract_executions 
       (contract_address, function_name, caller, parameters, result, gas_used) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        this.address,
        functionName,
        sender,
        JSON.stringify(params),
        JSON.stringify(result),
        result.gasUsed || 0
      ]
    );
  }
  
  // Get contract state
  getState() {
    const state = {};
    for (const [key, value] of this.storage.entries()) {
      state[key] = value;
    }
    
    return {
      address: this.address,
      creator: this.creator,
      balance: this.balance,
      storage: state,
      events: this.events.slice(-10), // Last 10 events
      nonce: this.nonce
    };
  }
  
  // Get contract events
  async getEvents(limit = 100, offset = 0) {
    const events = await db.query(
      `SELECT * FROM contract_events 
       WHERE contract_address = ? 
       ORDER BY id DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      [this.address]
    );
    
    return events.map(event => ({
      ...event,
      event_data: JSON.parse(event.event_data)
    }));
  }
  
  // Get contract executions
  async getExecutions(limit = 100, offset = 0) {
    const executions = await db.query(
      `SELECT * FROM contract_executions 
       WHERE contract_address = ? 
       ORDER BY id DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      [this.address]
    );
    
    return executions.map(exec => ({
      ...exec,
      parameters: JSON.parse(exec.parameters),
      result: JSON.parse(exec.result)
    }));
  }
}

// ERC20 Token Contract
class ERC20Token extends SmartContract {
  constructor(address, creator, name, symbol, decimals = 18) {
    const abi = [
      {
        "type": "function",
        "name": "transfer",
        "inputs": [
          { "name": "to", "type": "address" },
          { "name": "amount", "type": "uint256" }
        ]
      },
      {
        "type": "function",
        "name": "balanceOf",
        "inputs": [
          { "name": "address", "type": "address" }
        ]
      },
      {
        "type": "function",
        "name": "approve",
        "inputs": [
          { "name": "spender", "type": "address" },
          { "name": "amount", "type": "uint256" }
        ]
      },
      {
        "type": "function",
        "name": "mint",
        "inputs": [
          { "name": "to", "type": "address" },
          { "name": "amount", "type": "uint256" }
        ]
      },
      {
        "type": "function",
        "name": "burn",
        "inputs": [
          { "name": "amount", "type": "uint256" }
        ]
      }
    ];
    
    const bytecode = '0x' + crypto.randomBytes(32).toString('hex');
    
    super(address, creator, bytecode, abi);
    
    // Initialize ERC20 specific storage
    this.storage.set('name', name);
    this.storage.set('symbol', symbol);
    this.storage.set('decimals', decimals);
    this.storage.set('totalSupply', 0);
    this.storage.set('minter', creator);
  }
}

// NFT Contract (ERC721)
class NFTContract extends SmartContract {
  constructor(address, creator, name, symbol) {
    const abi = [
      {
        "type": "function",
        "name": "mint",
        "inputs": [
          { "name": "to", "type": "address" },
          { "name": "tokenId", "type": "uint256" }
        ]
      },
      {
        "type": "function",
        "name": "transfer",
        "inputs": [
          { "name": "from", "type": "address" },
          { "name": "to", "type": "address" },
          { "name": "tokenId", "type": "uint256" }
        ]
      },
      {
        "type": "function",
        "name": "ownerOf",
        "inputs": [
          { "name": "tokenId", "type": "uint256" }
        ]
      },
      {
        "type": "function",
        "name": "approve",
        "inputs": [
          { "name": "to", "type": "address" },
          { "name": "tokenId", "type": "uint256" }
        ]
      }
    ];
    
    const bytecode = '0x' + crypto.randomBytes(32).toString('hex');
    
    super(address, creator, bytecode, abi);
    
    // Initialize NFT specific storage
    this.storage.set('name', name);
    this.storage.set('symbol', symbol);
    this.storage.set('nextTokenId', 1);
  }
  
  // Mint NFT
  async executeMint(sender, params) {
    const [to, tokenId] = params;
    
    // Check if token already exists
    const tokenKey = `token_${tokenId}`;
    if (this.storage.get(tokenKey)) {
      throw new Error('Token already exists');
    }
    
    // Mint token
    this.storage.set(tokenKey, to);
    
    // Update owner's token list
    const ownerTokensKey = `tokens_${to}`;
    const ownerTokens = JSON.parse(this.storage.get(ownerTokensKey) || '[]');
    ownerTokens.push(tokenId);
    this.storage.set(ownerTokensKey, JSON.stringify(ownerTokens));
    
    // Increment next token ID
    const nextTokenId = parseInt(this.storage.get('nextTokenId') || 1);
    this.storage.set('nextTokenId', nextTokenId + 1);
    
    return {
      success: true,
      to: to,
      tokenId: tokenId,
      owner: to
    };
  }
}

module.exports = {
  SmartContract,
  ERC20Token,
  NFTContract
};