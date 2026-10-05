const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const Member = require('../backend/src/models/Member');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/politics');
  const epics = ['SNE1091115', 'SNE0812636', 'SNE1688308', 'SNE0410399'];
  const docs = await Member.find({ voterId: { $in: epics } }).lean();
  console.log(JSON.stringify(docs.map(d => ({
    _id: d._id,
    name: d.name,
    voterId: d.voterId,
    houseNumber: d.houseNumber,
    rawHouseNumber: d.rawHouseNumber,
    suggestedHouseNumber: d.suggestedHouseNumber,
    cardImage: d.cardImage,
    ocrCardImage: d.ocrCardImage,
    ocrValues: d.ocrValues
  })), null, 2));
  await mongoose.disconnect();
}
test().catch(console.error);
