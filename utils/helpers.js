// Helper functions ဖိုင်
const crypto = require('crypto');

class Helpers {
  // Random string generate လုပ်ခြင်း
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Random number generate လုပ်ခြင်း
  static generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // Current timestamp ရယူခြင်း
  static getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
  }
  
  // Date format ပြောင်းခြင်း
  static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    
    const pad = (num) => num.toString().padStart(2, '0');
    
    const replacements = {
      'YYYY': d.getFullYear(),
      'MM': pad(d.getMonth() + 1),
      'DD': pad(d.getDate()),
      'HH': pad(d.getHours()),
      'mm': pad(d.getMinutes()),
      'ss': pad(d.getSeconds())
    };
    
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => replacements[match]);
  }
  
  // Object မှ null/undefined values ဖယ်ရှားခြင်း
  static cleanObject(obj) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }
  
  // Array ကို paginate လုပ်ခြင်း
  static paginateArray(array, page = 1, limit = 10) {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    return {
      data: array.slice(startIndex, endIndex),
      pagination: {
        current_page: page,
        total_pages: Math.ceil(array.length / limit),
        total_items: array.length,
        items_per_page: limit,
        has_next: endIndex < array.length,
        has_previous: page > 1
      }
    };
  }
  
  // Sort array by property
  static sortArray(array, property, order = 'asc') {
    return array.sort((a, b) => {
      let aValue = a[property];
      let bValue = b[property];
      
      // Handle dates
      if (property.includes('_at') || property.includes('date') || property.includes('time')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }
  
  // Filter array by multiple criteria
  static filterArray(array, filters) {
    return array.filter(item => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null) continue;
        
        const itemValue = item[key];
        
        // String contains filter
        if (typeof value === 'string' && typeof itemValue === 'string') {
          if (!itemValue.toLowerCase().includes(value.toLowerCase())) {
            return false;
          }
        }
        // Exact match filter
        else if (itemValue !== value) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // Group array by property
  static groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }
  
  // Calculate statistics
  static calculateStatistics(array, valueProperty) {
    if (array.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0
      };
    }
    
    const values = array.map(item => parseFloat(item[valueProperty] || 0));
    
    return {
      count: array.length,
      sum: values.reduce((a, b) => a + b, 0),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }
  
  // Generate unique ID
  static generateUniqueId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  }
  
  // Validate email format
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Validate URL format
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  // Truncate text
  static truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  // Convert snake_case to camelCase
  static snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  // Convert camelCase to snake_case
  static camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  // Deep clone object
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  // Merge objects deeply
  static deepMerge(target, source) {
    const output = Object.assign({}, target);
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  // Check if value is object
  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
  
  // Delay function
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Retry function with exponential backoff
  static async retry(fn, retries = 3, delayMs = 1000) {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      
      await this.delay(delayMs);
      return this.retry(fn, retries - 1, delayMs * 2);
    }
  }
  
  // Generate QR code data (text representation)
  static generateQRCodeData(text) {
    // Simple text representation for demo
    // In production, use a QR code library like qrcode
    const lines = [];
    const size = 20;
    
    for (let y = 0; y < size; y++) {
      let line = '';
      for (let x = 0; x < size; x++) {
        const shouldShow = crypto.randomBytes(1)[0] > 128;
        line += shouldShow ? '██' : '  ';
      }
      lines.push(line);
    }
    
    return {
      text: text,
      representation: lines.join('\n'),
      size: size
    };
  }
  
  // Calculate percentage
  static calculatePercentage(part, total) {
    if (total === 0) return 0;
    return (part / total) * 100;
  }
  
  // Format currency
  static formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
  
  // Format number with commas
  static formatNumber(number, decimals = 2) {
    return parseFloat(number).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  
  // Generate password hash (alternative to bcrypt for simple cases)
  static simpleHash(password, salt = 'blockchain') {
    return crypto
      .createHash('sha256')
      .update(password + salt)
      .digest('hex');
  }
  
  // Generate API key
  static generateApiKey() {
    return `api_${crypto.randomBytes(16).toString('hex')}`;
  }
  
  // Generate secret
  static generateSecret() {
    return crypto.randomBytes(32).toString('base64');
  }
  
  // Mask sensitive data
  static maskData(data, visibleChars = 4) {
    if (!data || data.length <= visibleChars * 2) {
      return '*'.repeat(data?.length || 0);
    }
    
    const first = data.substring(0, visibleChars);
    const last = data.substring(data.length - visibleChars);
    const middle = '*'.repeat(data.length - visibleChars * 2);
    
    return first + middle + last;
  }
}

module.exports = Helpers;