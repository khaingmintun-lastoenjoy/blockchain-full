// Smart startup script
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Blockchain System Startup');
console.log('===========================');

// Kill any existing processes
console.log('🛑 Killing existing processes...');

const ports = [3000, 5001, 5002, 5003];

ports.forEach(port => {
  exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, (error) => {
    if (!error) {
      console.log(`✓ Killed processes on port ${port}`);
    }
  });
});

// Wait for processes to be killed
setTimeout(() => {
  console.log('\n✅ Cleanup completed');
  console.log('\n📁 Checking environment...');
  
  // Check if .env exists
  if (!fs.existsSync(path.join(__dirname, '.env'))) {
    console.log('⚠️  .env file not found. Creating from example...');
    if (fs.existsSync(path.join(__dirname, '.env.example'))) {
      fs.copyFileSync(path.join(__dirname, '.env.example'), path.join(__dirname, '.env'));
      console.log('✓ Created .env file');
    } else {
      console.error('❌ .env.example not found either!');
      process.exit(1);
    }
  }
  
  console.log('✓ Environment checked');
  
  // Ask which services to start
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\nWhich services to start?\n1. API Server only\n2. API + P2P Node 1\n3. API + P2P Node 2\n4. All services\nEnter choice (1-4): ', (choice) => {
    readline.close();
    
    let envVars = {};
    
    switch(choice) {
      case '1':
        envVars = { ENABLE_P2P: 'false', ENABLE_MINING: 'false' };
        startService(envVars, 'API Server only');
        break;
      case '2':
        envVars = { ENABLE_P2P: 'true', P2P_PORT: '5001', ENABLE_MINING: 'true' };
        startService(envVars, 'API + P2P Node 1');
        break;
      case '3':
        envVars = { ENABLE_P2P: 'true', P2P_PORT: '5002', ENABLE_MINING: 'true' };
        startService(envVars, 'API + P2P Node 2');
        break;
      case '4':
        // Start multiple nodes
        console.log('\nStarting all services...');
        
        // Node 1
        setTimeout(() => {
          startService(
            { ENABLE_P2P: 'true', P2P_PORT: '5001', PORT: '3001', ENABLE_MINING: 'true' },
            'Node 1 (Port 3001, P2P 5001)',
            true
          );
        }, 1000);
        
        // Node 2
        setTimeout(() => {
          startService(
            { ENABLE_P2P: 'true', P2P_PORT: '5002', PORT: '3002', ENABLE_MINING: 'true' },
            'Node 2 (Port 3002, P2P 5002)',
            true
          );
        }, 3000);
        
        // Node 3
        setTimeout(() => {
          startService(
            { ENABLE_P2P: 'true', P2P_PORT: '5003', PORT: '3003', ENABLE_MINING: 'true' },
            'Node 3 (Port 3003, P2P 5003)',
            true
          );
        }, 5000);
        break;
      default:
        console.log('Starting default configuration...');
        envVars = { ENABLE_P2P: 'true', P2P_PORT: '5001', ENABLE_MINING: 'true' };
        startService(envVars, 'Default configuration');
    }
  });
}, 2000);

function startService(envVars, description, silent = false) {
  if (!silent) {
    console.log(`\n▶️  Starting: ${description}`);
  }
  
  // Build environment string
  let envString = '';
  for (const [key, value] of Object.entries(envVars)) {
    envString += `${key}=${value} `;
  }
  
  const command = `${envString}node app.js`;
  
  const child = exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error in ${description}:`, error.message);
      return;
    }
    
    if (stderr) {
      console.error(`Stderr in ${description}:`, stderr);
    }
  });
  
  // Pipe output
  child.stdout.on('data', (data) => {
    if (!silent || data.includes('error') || data.includes('Error')) {
      console.log(`[${description}] ${data}`);
    }
  });
  
  child.stderr.on('data', (data) => {
    console.error(`[${description} ERROR] ${data}`);
  });
  
  // Handle process exit
  child.on('exit', (code) => {
    console.log(`[${description}] Exited with code ${code}`);
  });
  
  return child;
}