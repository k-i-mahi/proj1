const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Civita MERN Stack Project...\n');

// Create .env files from examples
const createEnvFiles = () => {
  console.log('📝 Creating environment files...');
  
  // Backend .env
  if (!fs.existsSync('backend/.env')) {
    fs.copyFileSync('backend/env.example', 'backend/.env');
    console.log('✅ Created backend/.env');
  }
  
  // Frontend .env
  if (!fs.existsSync('frontend/.env')) {
    fs.copyFileSync('frontend/env.example', 'frontend/.env');
    console.log('✅ Created frontend/.env');
  }
};

// Install dependencies
const installDependencies = () => {
  console.log('\n📦 Installing dependencies...');
  
  try {
    // Install root dependencies
    console.log('Installing root dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    // Install backend dependencies
    console.log('Installing backend dependencies...');
    execSync('cd backend && npm install', { stdio: 'inherit' });
    
    // Install frontend dependencies
    console.log('Installing frontend dependencies...');
    execSync('cd frontend && npm install', { stdio: 'inherit' });
    
    console.log('✅ All dependencies installed successfully!');
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    process.exit(1);
  }
};

// Main setup function
const setup = () => {
  try {
    createEnvFiles();
    installDependencies();
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Make sure MongoDB is running on your system');
    console.log('2. Update backend/.env with your MongoDB connection string');
    console.log('3. Update frontend/.env with your API URL if needed');
    console.log('4. Run "npm run dev" to start both servers');
    console.log('\n🔗 The application will be available at:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend:  http://localhost:5000');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

setup();
