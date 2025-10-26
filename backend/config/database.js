// config/database.js

const mongoose = require('mongoose');

/**
 * Connect to MongoDB with enhanced configuration
 */
const connectDB = async () => {
  try {
    // Connection options
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/civita',
      options,
    );

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Mongoose disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('⚠️  Mongoose connection closed due to app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

/**
 * Get database connection status
 */
const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    status: states[mongoose.connection.readyState],
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
};

/**
 * Disconnect from database
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
};

/**
 * Check if database is connected
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  connectDB,
  disconnectDB,
  getDBStatus,
  isConnected,
};
