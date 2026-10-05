const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Member = require('../src/models/Member');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Check Bheru KDY1228386
  const bheru = await Member.findOne({ voterId: 'KDY1228386' }).lean();
  console.log('Bheru by voterId KDY1228386:', bheru ? {
    id: bheru._id,
    name: bheru.name,
    voterId: bheru.voterId,
    voterSerial: bheru.voterSerial,
    wardNumber: bheru.wardNumber,
    wardVoterSerial: bheru.wardVoterSerial,
    village: bheru.village,
    photo: bheru.photo
  } : 'NOT FOUND IN LOCAL DB');

  // Check Movani KDY0956649
  const movani = await Member.findOne({ voterId: 'KDY0956649' }).lean();
  console.log('Movani by voterId KDY0956649:', movani ? {
    id: movani._id,
    name: movani.name,
    voterId: movani.voterId,
    photo: movani.photo
  } : 'NOT FOUND IN LOCAL DB');

  // Also check if any member with name भेरू exists
  const bheruList = await Member.find({ name: /भेरू/ }).limit(5).lean();
  console.log('Any Bheru in local DB:', bheruList.map(m => ({ name: m.name, voterId: m.voterId, photo: m.photo })));

  process.exit(0);
}
check();
