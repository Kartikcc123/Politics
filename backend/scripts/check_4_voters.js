require('dotenv').config();
const mongoose = require('mongoose');

async function checkSpecificVoters() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const coll = db.collection('members');

  const epics = ['SNE1932870', 'SNE1932870-REV-5', 'SNE1690379', 'SNE1986291', 'SNE1922608'];

  console.log('Inspecting specific 4 voters:');
  for (const epic of epics) {
    const doc = await coll.findOne({ $or: [{ voterId: new RegExp(epic, 'i') }, { epicNumber: new RegExp(epic, 'i') }] });
    if (doc) {
      console.log({
        voterId: doc.voterId,
        name: doc.name,
        guardianName: doc.guardianName,
        photo: doc.photo,
        cardImage: doc.cardImage,
        ocrCardImage: doc.ocrCardImage
      });
    }
  }

  await mongoose.disconnect();
}

checkSpecificVoters();
