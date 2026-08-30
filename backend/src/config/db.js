const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/political_crm';

module.exports = async function connectDB() {
  try {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
    return mongoose.connection;
  } catch (err) {
    console.error(`MongoDB connection failed for ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//<user>:<password>@')}`);
    console.error(err.message);
    throw err;
  }
};
