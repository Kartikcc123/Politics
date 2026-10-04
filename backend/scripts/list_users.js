const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');

async function listUsers() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  const users = await User.find().select('name email role active phone permissions').lean();
  console.log('--- ALL REGISTERED USERS IN DATABASE ---');
  for (const u of users) {
    console.log(`- ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Active: ${u.active} | Phone: ${u.phone || '-'}`);
  }
  process.exit(0);
}

listUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
