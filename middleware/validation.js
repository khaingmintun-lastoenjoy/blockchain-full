// Validation middleware ဖိုင်
const { body, param, query, validationResult } = require('express-validator');

// Common validation rules
const commonValidations = {
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email address ဖြည့်ရန်'),
  password: body('password').isLength({ min: 6 }).withMessage('Password အနည်းဆုံး ၆ လုံးဖြည့်ရန်'),
  username: body('username').isLength({ min: 3, max: 50 }).withMessage('Username 3 မှ 50 လုံးအတွင်း ဖြည့်ရန်'),
  address: body('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid Ethereum address ဖြည့်ရန်'),
  amount: body('amount').isFloat({ gt: 0 }).withMessage('Amount သုညထက် ကြီးရမည်'),
  hash: body('hash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Valid transaction hash ဖြည့်ရန်'),
  blockNumber: param('number').isInt({ min: 0 }).withMessage('Valid block number ဖြည့်ရန်')
};

// Registration validation
const registerValidation = [
  commonValidations.username,
  commonValidations.email,
  commonValidations.password,
  body('role').optional().isIn(['user', 'admin', 'dao_member']).withMessage('Valid role ဖြည့်ရန်')
];

// Login validation
const loginValidation = [
  commonValidations.email,
  commonValidations.password
];

// Transaction validation
const transactionValidation = [
  commonValidations.address.withMessage('From address ဖြည့်ရန်'),
  body('to_address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('To address ဖြည့်ရန်'),
  commonValidations.amount,
  body('token_id').optional().isInt().withMessage('Valid token ID ဖြည့်ရန်')
];

// Token creation validation
const tokenCreationValidation = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Token name ဖြည့်ရန်'),
  body('symbol').isLength({ min: 1, max: 10 }).withMessage('Token symbol ဖြည့်ရန်'),
  body('total_supply').isFloat({ gt: 0 }).withMessage('Total supply ဖြည့်ရန်'),
  body('decimals').optional().isInt({ min: 0, max: 18 }).withMessage('Decimals 0 မှ 18 အတွင်း ဖြည့်ရန်'),
  body('type').isIn(['native', 'erc20', 'erc721', 'erc1155']).withMessage('Valid token type ဖြည့်ရန်')
];

// Contract deployment validation
const contractDeploymentValidation = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Contract name ဖြည့်ရန်'),
  commonValidations.address.withMessage('Contract address ဖြည့်ရန်'),
  body('type').isIn(['defi', 'nft', 'dao', 'bridge', 'other']).withMessage('Valid contract type ဖြည့်ရန်')
];

// DAO creation validation
const daoCreationValidation = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('DAO name ဖြည့်ရန်'),
  body('governance_token_id').isInt().withMessage('Governance token ID ဖြည့်ရန်'),
  body('voting_duration').optional().isInt({ min: 3600 }).withMessage('Voting duration အနည်းဆုံး 1 hour ဖြည့်ရန်'),
  body('min_quorum').optional().isFloat({ min: 1, max: 100 }).withMessage('Min quorum 1 မှ 100 အတွင်း ဖြည့်ရန်')
];

// Proposal creation validation
const proposalCreationValidation = [
  body('title').isLength({ min: 1, max: 200 }).withMessage('Proposal title ဖြည့်ရန်'),
  body('dao_id').isInt().withMessage('DAO ID ဖြည့်ရန်')
];

// Bridge transfer validation
const bridgeTransferValidation = [
  body('source_network').isLength({ min: 1 }).withMessage('Source network ဖြည့်ရန်'),
  body('target_network').isLength({ min: 1 }).withMessage('Target network ဖြည့်ရန်'),
  commonValidations.amount,
  body('sender_address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Sender address ဖြည့်ရန်'),
  body('receiver_address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Receiver address ဖြည့်ရန်')
];

// DeFi pool creation validation
const defiPoolCreationValidation = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Pool name ဖြည့်ရန်'),
  body('token_a_id').isInt().withMessage('Token A ID ဖြည့်ရန်'),
  body('token_b_id').isInt().withMessage('Token B ID ဖြည့်ရန်'),
  body('apr').optional().isFloat({ min: 0 }).withMessage('APR သုညထက် ကြီးရမည်')
];

// Query parameter validation
const paginationValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1 မှ 100 အတွင်း ဖြည့်ရန်'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset သုညထက် ကြီးရမည်')
];

// Validate middleware function
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Export all validations
module.exports = {
  commonValidations,
  registerValidation,
  loginValidation,
  transactionValidation,
  tokenCreationValidation,
  contractDeploymentValidation,
  daoCreationValidation,
  proposalCreationValidation,
  bridgeTransferValidation,
  defiPoolCreationValidation,
  paginationValidation,
  validate
};