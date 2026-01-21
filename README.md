# Blockchain System Backend

## စီမံကိန်းအကြောင်း
Blockchain System Backend သည် အပြည့်အစုံသော blockchain စနစ်တစ်ခုကို ဖန်တီးထားပါသည်။ ဤစနစ်တွင် အောက်ပါ feature များ ပါဝင်ပါသည်။

## စတင်အသုံးပြုရန် လိုအပ်သော Software များ

### 1. လိုအပ်သော Software များ
- **Node.js** (version 14 သို့မဟုတ် အထက်)
- **MySQL** (version 5.7 သို့မဟုတ် အထက်)
- **Postman** (API များကို test လုပ်ရန်)
- **Git** (project ကို clone လုပ်ရန်)

### 2. စက်ထဲတွင် ရှိပြီးသား စစ်ဆေးရန်
```bash
# Node.js version စစ်ဆေးရန်
node --version

# npm version စစ်ဆေးရန်
npm --version

# MySQL status စစ်ဆေးရန်
mysql --version
```

## Installation လုပ်နည်း

### Step 1: Project ကို Download လုပ်ပါ
```bash
# GitHub မှ project ကို clone လုပ်ပါ
git clone https://github.com/khaingmintun-lastoenjoy/blockchain-full.git

# Project folder ထဲသို့ ဝင်ပါ
cd blockchain-backend
```

### Step 2: Dependencies များ Install လုပ်ပါ
```bash
# လိုအပ်သော packages များကို install လုပ်ပါ
npm install
```

### Step 3: Environment Variables များ Setup လုပ်ပါ
```bash
# Environment file ကို copy လုပ်ပါ
cp .env.example .env

# .env file ကို edit လုပ်ပါ
# သင့် MySQL database credentials များကို ထည့်သွင်းပါ
nano .env
```

### Step 4: Database Setup လုပ်ပါ
```bash
# MySQL ထဲသို့ ဝင်ပါ
mysql -u root -p

# Database ဖန်တီးပါ
CREATE DATABASE blockchain_all;

# Database ကို အသုံးပြုပါ
USE blockchain_all;

# ထွက်ပါ
EXIT;
```

### Step 5: Database Tables များ ဖန်တီးပါ
```bash
# Database tables များကို ဖန်တီးပါ
npm run migrate

# Initial data များ ထည့်သွင်းပါ
npm run seed
```

### Step 6: Server စတင်ပါ
```bash
# Development mode တွင် စတင်ပါ
npm run dev

# Production mode တွင် စတင်ပါ
npm start
```

## API Endpoints များ

### Authentication (အကောင့်ဝင်ရောက်မှု)
- `POST /api/auth/register` - **အကောင့်အသစ် ဖန်တီးရန်**
- `POST /api/auth/login` - **အကောင့်ဝင်ရန်**
- `GET /api/auth/profile` - **Profile ကြည့်ရန်**

### Wallet (ငွေအိတ်)
- `POST /api/wallet/create` - **Wallet အသစ် ဖန်တီးရန်**
- `GET /api/wallet/my-wallets` - **ကိုယ်ပိုင်ငွေအိတ်များ ကြည့်ရန်**
- `GET /api/wallet/balance/:address` - **Balance ကြည့်ရန်**
- `GET /api/wallet/transactions/:address` - **Wallet transactions ကြည့်ရန်**

### Transaction (လွှဲပြောင်းမှု)
- `POST /api/transaction/send` - **Transaction ပို့ရန်**
- `GET /api/transaction/:hash` - **Transaction ကြည့်ရန်**
- `GET /api/transaction/recent` - **နောက်ဆုံး transactions များ ကြည့်ရန်**
- `GET /api/transaction/pending` - **ဆိုင်းငံ့နေသော transactions များ ကြည့်ရန်**

### Blockchain (ဘလော့ခ်ချိန်း)
- `GET /api/blockchain/blocks/latest` - **နောက်ဆုံး block ကြည့်ရန်**
- `GET /api/blockchain/blocks/:number` - **Block number ဖြင့် block ကြည့်ရန်**
- `POST /api/blockchain/blocks` - **Block အသစ် ဖန်တီးရန် (Admin only)**
- `GET /api/blockchain/status` - **Blockchain status ကြည့်ရန်**

### Token (တိုကင်များ)
- `POST /api/token/create` - **Token အသစ် ဖန်တီးရန်**
- `GET /api/token/list` - **Tokens အားလုံး ကြည့်ရန်**
- `GET /api/token/:symbol` - **Token symbol ဖြင့် ရှာရန်**
- `PUT /api/token/:id` - **Token metadata update လုပ်ရန် (Admin only)**

### Smart Contract (စမတ်ကွန်ထရက်)
- `POST /api/contract/deploy` - **Contract deploy လုပ်ရန်**
- `GET /api/contract/verified` - **Verified contracts များ ကြည့်ရန်**
- `GET /api/contract/:address` - **Contract address ဖြင့် ရှာရန်**
- `POST /api/contract/:id/verify` - **Contract verify လုပ်ရန် (Admin only)**

### DeFi (Decentralized Finance)
- `POST /api/defi/pools/create` - **DeFi pool အသစ် ဖန်တီးရန်**
- `GET /api/defi/pools` - **DeFi pools အားလုံး ကြည့်ရန်**
- `POST /api/defi/pools/:id/add-liquidity` - **Liquidity ထည့်သွင်းရန်**
- `PUT /api/defi/pools/:id/apr` - **APR update လုပ်ရန် (Admin only)**

### Bridge (ချိတ်ဆက်ခြင်း)
- `POST /api/bridge/transfer` - **Cross-chain transfer စတင်ရန်**
- `GET /api/bridge/transactions` - **Bridge transactions များ ကြည့်ရန်**
- `GET /api/bridge/networks` - **Supported networks များ ကြည့်ရန်**
- `PUT /api/bridge/transactions/:id/status` - **Bridge transaction status update လုပ်ရန်**

### DAO (Decentralized Autonomous Organization)
- `POST /api/dao/create` - **DAO အသစ် ဖန်တီးရန်**
- `GET /api/dao/list` - **DAO အားလုံး ကြည့်ရန်**
- `POST /api/dao/:daoId/proposals/create` - **Proposal အသစ် ဖန်တီးရန်**
- `GET /api/dao/:daoId/proposals` - **DAO proposals များ ကြည့်ရန်**
- `POST /api/dao/proposals/:proposalId/vote` - **Vote ပေးရန်**

### P2P Network (Peer-to-Peer ကွန်ယက်)
- `POST /api/p2p/start` - **P2P network စတင်ရန်**
- `POST /api/p2p/connect` - **Peer နှင့် ချိတ်ဆက်ရန်**
- `GET /api/p2p/peers` - **Connected peers များ ကြည့်ရန်**
- `GET /api/p2p/stats` - **Network statistics ကြည့်ရန်**

### Mining (တူးဖော်ခြင်း)
- `POST /api/mining/start` - **Mining စတင်ရန်**
- `POST /api/mining/stop` - **Mining ရပ်ရန်**
- `GET /api/mining/stats` - **Miner statistics ကြည့်ရန်**
- `GET /api/mining/network-stats` - **Network mining statistics ကြည့်ရန်**

### Block Explorer (ဘလော့ခ် ရှာဖွေရေး)
- `GET /api/explorer/blocks` - **Blocks အားလုံး ကြည့်ရန်**
- `GET /api/explorer/blocks/:blockNumber` - **Block details ကြည့်ရန်**
- `GET /api/explorer/transactions/:hash` - **Transaction details ကြည့်ရန်**
- `GET /api/explorer/address/:address` - **Address details ကြည့်ရန်**
- `GET /api/explorer/search` - **Blockchain ထဲတွင် ရှာဖွေရန်**

### Network Monitoring (ကွန်ယက် စောင့်ကြည့်ခြင်း)
- `GET /api/network/status` - **Network status ကြည့်ရန်**
- `GET /api/network/node-stats` - **Node statistics ကြည့်ရန်**
- `GET /api/network/peers` - **Network peers ကြည့်ရန်**
- `GET /api/network/latency` - **Network latency ကြည့်ရန်**
- `GET /api/network/system-health` - **System health ကြည့်ရန်**

## Testing API များ

### Postman Collection အသုံးပြုနည်း
1. **Postman** application ကို ဖွင့်ပါ
2. **Import** ကို နှိပ်ပါ
3. **Postman collection JSON file** ကို ရွေးချယ်ပါ
4. Collection ကို import လုပ်ပါ
5. Environment variables များ setup လုပ်ပါ
6. API endpoints များကို test လုပ်ပါ

### ပထမဆုံး API Test လုပ်နည်း
1. **Register API** ကို အရင်ဆုံး test လုပ်ပါ
```json
POST http://localhost:3000/api/auth/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

2. **Login API** ဖြင့် token ရယူပါ
```json
POST http://localhost:3000/api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}
```

3. **Token ကို သိမ်းပါ** နှင့် အခြား API များကို test လုပ်ပါ

## Database Structure (Database ဖွဲ့စည်းပုံ)

### အဓိက Tables များ
1. **users** - သုံးစွဲသူများ
2. **wallets** - ငွေအိတ်များ
3. **transactions** - လွှဲပြောင်းမှုများ
4. **blocks** - ဘလော့ခ်များ
5. **tokens** - တိုကင်များ
6. **contracts** - စမတ်ကွန်ထရက်များ
7. **daos** - DAO များ
8. **dao_proposals** - DAO အဆိုပြုချက်များ
9. **bridge_transactions** - ချိတ်ဆက်မှုများ
10. **defi_pools** - DeFi ပွိုင်များ

## Security Features (လုံခြုံရေး စနစ်များ)

### 1. Authentication & Authorization
- **JWT Token** အသုံးပြုထားသည်
- **Role-based access control** (User, Admin, DAO Member)
- **Token expiration** (24 hours)

### 2. Data Protection
- **Password hashing** (bcryptjs အသုံးပြုထားသည်)
- **Input validation** (express-validator အသုံးပြုထားသည်)
- **SQL injection protection** (parameterized queries)

### 3. API Security
- **Rate limiting** (အသုံးပြုသူတစ်ဦးလျှင် 100 requests/15 minutes)
- **CORS protection**
- **Helmet.js** for security headers

### 4. Database Security
- **Connection pooling**
- **Environment variables** for sensitive data
- **Error handling** middleware

## Production အတွက် သတိပြုရန် အချက်များ

### 1. Environment Variables များ
```env
# Production အတွက် ပြောင်းလဲရန်
JWT_SECRET=your-strong-secret-key-here
DB_PASS=your-strong-database-password
```

### 2. HTTPS Implementation
```javascript
// Production တွင် HTTPS သုံးရန်
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private.key'),
  cert: fs.readFileSync('path/to/certificate.crt')
};

https.createServer(options, app).listen(443);
```

### 3. Database Backup
```bash
# Regular backup လုပ်ရန်
mysqldump -u root -p blockchain_all > backup_$(date +%Y%m%d).sql

# Auto backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p blockchain_all > /backups/blockchain_$DATE.sql
```

### 4. Monitoring & Logging
- **Application logs** ထားရှိရန်
- **Error tracking** (Sentry or similar)
- **Performance monitoring**
- **Alert system** ထားရှိရန်

## Common Issues & Solutions (အဖြစ်များသော ပြဿနာများနှင့် ဖြေရှင်းနည်းများ)

### 1. Database Connection Error
```bash
# Error: Access denied for user
# Solution: .env file ကို ပြန်စစ်ပါ
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_correct_password
DB_NAME=blockchain_all
```

### 2. Port Already in Use
```bash
# Error: Port 3000 already in use
# Solution: မတူညီသော port သုံးပါ
PORT=3001

# or kill the process
sudo lsof -i :3000
kill -9 PID
```

### 3. MySQL Not Running
```bash
# MySQL ကို start လုပ်ပါ
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# Windows
# MySQL Service ကို Start လုပ်ပါ
```

### 4. Node.js Version Issue
```bash
# Node.js version စစ်ဆေးပါ
node --version

# nvm အသုံးပြု၍ version ပြောင်းပါ
nvm install 18
nvm use 18
```

## Project Structure (စီမံကိန်း ဖွဲ့စည်းပုံ)

```
blockchain-backend/
├── config/
│   └── database.js          # Database configuration
├── migrations/
│   ├── 001_init_tables.js   # Database tables
│   ├── 002_seed_data.js     # Initial data
│   └── 003_enhanced_features.js # Enhanced features
├── models/
│   ├── index.js             # Database connection
│   ├── User.js              # User model
│   ├── Wallet.js            # Wallet model
│   ├── Transaction.js       # Transaction model
│   ├── Block.js             # Block model
│   ├── Token.js             # Token model
│   ├── Contract.js          # Contract model
│   ├── Dao.js               # DAO model
│   └── Blockchain.js        # Blockchain core model
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── validation.js        # Validation middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── wallet.js            # Wallet routes
│   ├── transaction.js       # Transaction routes
│   ├── blockchain.js        # Blockchain routes
│   ├── token.js             # Token routes
│   ├── contract.js          # Contract routes
│   ├── defi.js              # DeFi routes
│   ├── bridge.js            # Bridge routes
│   ├── dao.js               # DAO routes
│   ├── p2p.js               # P2P routes
│   ├── mining.js            # Mining routes
│   ├── explorer.js          # Explorer routes
│   └── network.js           # Network routes
├── utils/
│   ├── blockchain.js        # Blockchain utilities
│   └── helpers.js           # Helper functions
├── p2p/
│   ├── peer.js              # P2P node
│   └── network-manager.js   # Network manager
├── contracts/
│   └── smart-contract.js    # Smart contract system
├── bridge/
│   └── bridge-engine.js     # Bridge engine
├── mining/
│   └── miner.js             # Mining system
├── app.js                   # Main application
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .env                     # Environment variables
└── README.md                # Documentation
```

## Features များ အသေးစိတ်

### 1. Authentication System (အကောင့်ဝင်ရောက်မှု စနစ်)
- User registration & login
- JWT token authentication
- Role-based permissions
- Password reset (ready for implementation)

### 2. Wallet System (ငွေအိတ် စနစ်)
- Multiple wallet creation
- Balance management
- Transaction history
- Multi-currency support

### 3. Blockchain Core (ဘလော့ခ်ချိန်း အခြေခံ)
- Block creation & mining
- Transaction validation
- Consensus mechanism
- Chain synchronization

### 4. Smart Contracts (စမတ်ကွန်ထရက်)
- Contract deployment
- ABI management
- Contract execution
- Event logging

### 5. DeFi Features (Decentralized Finance)
- Liquidity pools
- Yield farming
- Staking mechanisms
- APR calculation

### 6. Cross-chain Bridge (ချိတ်ဆက်ခြင်း)
- Multi-network support
- Token bridging
- Transaction monitoring
- Fee calculation

### 7. DAO Governance (DAO အုပ်ချုပ်ရေး)
- Proposal creation
- Voting system
- Treasury management
- Quorum calculation

### 8. P2P Network (Peer-to-Peer ကွန်ယက်)
- Node discovery
- Message broadcasting
- Chain synchronization
- Network monitoring

### 9. Mining System (တူးဖော်ခြင်း စနစ်)
- Proof of Work algorithm
- Mining rewards
- Difficulty adjustment
- Mining pools

## Development Guidelines (ဖွံ့ဖြိုးမှု လမ်းညွှန်ချက်များ)

### Code Style
- **ES6+ syntax** အသုံးပြုရန်
- **Async/await** pattern အသုံးပြုရန်
- **Error handling** ကောင်းမွန်စွာ ရေးရန်
- **Comments** မြန်မာလို ရေးရန်

### Testing
```bash
# Unit tests run လုပ်ရန်
npm test

# Test coverage check လုပ်ရန်
npm test -- --coverage
```

### Code Quality
```bash
# ESLint ဖြင့် code check လုပ်ရန်
npx eslint .

# Code formatting
npx prettier --write .
```

## Support & Contact (အကူအညီနှင့် ဆက်သွယ်ရန်)

### Issues တက်ပါက
1. GitHub Issues တွင် report လုပ်ပါ
2. Error message နှင့် log များကို ပို့ပါ
3. Steps to reproduce ရေးပါ
4. Expected vs actual behavior ရှင်းပြပါ

### Community Support
- **GitHub Discussions** - Technical discussions
- **Discord Server** - Real-time support
- **Documentation** - Detailed guides

## License (လိုင်စင်)
MIT License - လွတ်လပ်စွာ အသုံးပြုနိုင်ပါသည်။

## Contributors (ပါဝင်သူများ)
- Project Maintainer: [Your Name]
- Contributors: Open for contributions

## Changelog (ပြောင်းလဲမှု မှတ်တမ်း)

### Version 2.0.0 (Current)
- Complete blockchain backend system
- All requested features implemented
- Production-ready code
- Comprehensive documentation

### Version 1.0.0
- Initial release
- Basic blockchain features
- Core functionality

## နိဂုံး
ဤ Blockchain System Backend သည် အပြည့်အစုံသော blockchain စနစ်တစ်ခုဖြစ်ပြီး production environment တွင် အသုံးပြုနိုင်ပါသည်။ လုံခြုံရေး၊ စွမ်းဆောင်ရည်နှင့် scalability များကို အဓိကထား ဖန်တီးထားပါသည်။

ကျေးဇူးပြု၍ မေးခွန်းများ ရှိပါက issue တင်ပါ သို့မဟုတ် documentation ကို ဖတ်ရှုပါ။

**Happy Coding!**