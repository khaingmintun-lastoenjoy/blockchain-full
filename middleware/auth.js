// Authentication middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'blockchain-secret-key-2024';

// Token ဖန်တီးခြင်း
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Token စစ်ဆေးခြင်း middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication လိုအပ်ပါသည်။' 
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User မတွေ့ပါ။' 
      });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Admin only middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin permission လိုအပ်ပါသည်။' 
    });
  }
  next();
};

// DAO member middleware
const isDaoMember = (req, res, next) => {
  if (!['admin', 'dao_member'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'DAO member permission လိုအပ်ပါသည်။' 
    });
  }
  next();
};

module.exports = {
  generateToken,
  authenticate,
  isAdmin,
  isDaoMember
};