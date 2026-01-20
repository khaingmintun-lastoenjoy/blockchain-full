// Blockchain utility functions ဖိုင်
const crypto = require('crypto');

class BlockchainUtils {
  // Ethereum style address generate လုပ်ခြင်း
  static generateAddress() {
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = this.privateKeyToPublicKey(privateKey);
    const address = this.publicKeyToAddress(publicKey);
    return {
      privateKey: '0x' + privateKey,
      publicKey: '0x' + publicKey,
      address: '0x' + address
    };
  }
  
  // Private key မှ public key ရရှိခြင်း (simplified version)
  static privateKeyToPublicKey(privateKey) {
    // Note: လက်တွေ့တွင် elliptic curve cryptography သုံးရန်
    const cleanPrivateKey = privateKey.replace('0x', '');
    return crypto.createHash('sha256').update(cleanPrivateKey).digest('hex');
  }
  
  // Public key မှ address ရရှိခြင်း
  static publicKeyToAddress(publicKey) {
    const cleanPublicKey = publicKey.replace('0x', '');
    const hash = crypto.createHash('sha256').update(cleanPublicKey).digest('hex');
    return hash.substring(0, 40); // Ethereum address length
  }
  
  // Transaction hash generate လုပ်ခြင်း
  static generateTransactionHash(from, to, amount, nonce, timestamp) {
    const data = `${from}${to}${amount}${nonce}${timestamp}`;
    return '0x' + crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Block hash generate လုပ်ခြင်း
  static generateBlockHash(blockNumber, previousHash, timestamp, transactions, nonce) {
    const txRoot = this.calculateMerkleRoot(transactions);
    const data = `${blockNumber}${previousHash}${timestamp}${txRoot}${nonce}`;
    return '0x' + crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Merkle root တွက်ချက်ခြင်း
  static calculateMerkleRoot(transactions) {
    if (transactions.length === 0) {
      return '0x' + '0'.repeat(64);
    }
    
    let hashes = transactions.map(tx => 
      crypto.createHash('sha256').update(tx.hash).digest('hex')
    );
    
    while (hashes.length > 1) {
      const newHashes = [];
      
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = (i + 1 < hashes.length) ? hashes[i + 1] : hashes[i];
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        newHashes.push(combined);
      }
      
      hashes = newHashes;
    }
    
    return '0x' + hashes[0];
  }
  
  // Signature verify လုပ်ခြင်း (simplified)
  static verifySignature(message, signature, address) {
    // Note: လက်တွေ့တွင် elliptic curve signature verification သုံးရန်
    const expectedHash = crypto.createHash('sha256')
      .update(message + address)
      .digest('hex');
    
    return signature === expectedHash;
  }
  
  // Smart contract address generate လုပ်ခြင်း
  static generateContractAddress(deployerAddress, nonce) {
    const data = `${deployerAddress}${nonce}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return '0x' + hash.substring(0, 40);
  }
  
  // Token ID generate လုပ်ခြင်း (for ERC721/1155)
  static generateTokenId() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  // Validate Ethereum address
  static isValidAddress(address) {
    if (!address) return false;
    const cleanAddress = address.replace('0x', '');
    return /^[a-fA-F0-9]{40}$/.test(cleanAddress);
  }
  
  // Validate transaction hash
  static isValidTransactionHash(hash) {
    if (!hash) return false;
    const cleanHash = hash.replace('0x', '');
    return /^[a-fA-F0-9]{64}$/.test(cleanHash);
  }
  
  // Hex to decimal conversion
  static hexToDecimal(hexString) {
    return parseInt(hexString, 16);
  }
  
  // Decimal to hex conversion
  static decimalToHex(decimalNumber) {
    return '0x' + decimalNumber.toString(16);
  }
  
  // Wei to Ether conversion
  static weiToEther(wei) {
    return wei / 1e18;
  }
  
  // Ether to Wei conversion
  static etherToWei(ether) {
    return ether * 1e18;
  }
  
  // Gas price calculation
  static calculateGasPrice(baseFee, priorityFee) {
    return baseFee + priorityFee;
  }
  
  // Gas cost calculation
  static calculateGasCost(gasUsed, gasPrice) {
    return gasUsed * gasPrice;
  }
  
  // Difficulty adjustment (simplified)
  static adjustDifficulty(currentDifficulty, blockTime, targetBlockTime) {
    if (blockTime < targetBlockTime) {
      return currentDifficulty * 1.1; // Increase difficulty
    } else if (blockTime > targetBlockTime) {
      return currentDifficulty * 0.9; // Decrease difficulty
    }
    return currentDifficulty;
  }
  
  // Proof of Work (simplified)
  static mineBlock(blockData, difficulty) {
    let nonce = 0;
    let hash = '';
    const target = '0'.repeat(difficulty);
    
    while (true) {
      hash = this.generateBlockHash(
        blockData.blockNumber,
        blockData.previousHash,
        blockData.timestamp,
        blockData.transactions,
        nonce
      );
      
      if (hash.substring(2, 2 + difficulty) === target) {
        break;
      }
      
      nonce++;
    }
    
    return { hash, nonce };
  }
}

module.exports = BlockchainUtils;