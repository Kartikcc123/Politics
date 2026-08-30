require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const master = require('./config/raipurLocationMaster');
const { saveMasterData } = require('./controllers/areaController');

(async () => {
  try {
    await connectDB();
    const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
    const result = await saveMasterData({ ...master, assemblyNumber: '179', assemblyName: 'सहाड़ा' }, admin?._id);
    console.log(JSON.stringify(result));
    await mongoose.disconnect();
  } catch (error) {
    console.error(error.message);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  }
})();