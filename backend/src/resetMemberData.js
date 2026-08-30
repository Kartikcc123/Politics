require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Member = require('./models/Member');
const Family = require('./models/Family');

async function resetMemberData() {
  await connectDB();
  const [members, families] = await Promise.all([
    Member.deleteMany({}),
    Family.deleteMany({}),
  ]);
  console.log(`Deleted ${members.deletedCount} members and ${families.deletedCount} families.`);
  await mongoose.disconnect();
}

resetMemberData().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
