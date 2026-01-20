// Authentication routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');

// အကောင့်ဝင်ရန်
router.post('/login', [
  body('email').isEmail().withMessage('Valid email ဖြည့်ရန်'),
  body('password').notEmpty().withMessage('Password ဖြည့်ရန်')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }
    
    const isValidPassword = await User.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }
    
    const token = generateToken(user);
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    res.json({
      success: true,
      message: 'Login အောင်မြင်ပါသည်။',
      token,
      user: userData
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// အကောင့်အသစ် ဖန်တီးရန်
router.post('/register', [
  body('username').notEmpty().withMessage('Username ဖြည့်ရန်'),
  body('email').isEmail().withMessage('Valid email ဖြည့်ရန်'),
  body('password').isLength({ min: 6 }).withMessage('Password အနည်းဆုံး ၆ လုံးဖြည့်ရန်')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { username, email, password } = req.body;
    
    // Email ရှိပြီးသား စစ်ဆေးခြင်း
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email ရှိပြီးသားဖြစ်နေပါသည်။' 
      });
    }
    
    const user = await User.create({ username, email, password });
    const token = generateToken(user);
    
    res.status(201).json({
      success: true,
      message: 'User အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။',
      token,
      user
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// Profile ကြည့်ရန်
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;