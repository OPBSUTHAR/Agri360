const { exec } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing Agri360 Setup...\n');

// Check if directories exist
const directories = ['server', 'client'];
directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir}/ directory exists`);
  } else {
    console.log(`❌ ${dir}/ directory missing`);
  }
});

// Check package.json files
const packages = ['package.json', 'server/package.json', 'client/package.json'];
packages.forEach(pkg => {
  if (fs.existsSync(pkg)) {
    console.log(`✅ ${pkg} exists`);
  } else {
    console.log(`❌ ${pkg} missing`);
  }
});

// Check Node version
exec('node --version', (error, stdout) => {
  if (error) {
    console.log('❌ Node.js not installed');
  } else {
    console.log(`✅ Node.js ${stdout.trim()}`);
  }
});

// Check npm version
exec('npm --version', (error, stdout) => {
  if (error) {
    console.log('❌ npm not installed');
  } else {
    console.log(`✅ npm ${stdout.trim()}`);
  }
});

console.log('\n📋 Next Steps:');
console.log('1. Install dependencies: npm run install-all');
console.log('2. Start development: npm run dev');
console.log('3. Open browser: http://localhost:3000');