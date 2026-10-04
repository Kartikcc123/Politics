require('dotenv').config();
const mongoose = require('mongoose');

async function inspectExcelVoters() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const coll = db.collection('members');

  const epics = ['RJ/20/152/000155', 'SNE1651264', 'KDY0910059', 'SNE0891838', 'KDY0910232'];

  console.log('Inspecting Excel voters in database:');
  for (const epic of epics) {
    const docs = await coll.find({ $or: [{ voterId: epic }, { epicNumber: epic }] }).toArray();
    console.log(`\nEPIC: ${epic} (Found ${docs.length} records):`);
    for (const d of docs) {
      console.log({
        _id: d._id,
        name: d.name,
        guardianName: d.guardianName,
        voterId: d.voterId,
        photo: d.photo,
        photoUrl: d.photoUrl,
        cardImage: d.cardImage,
        assemblyName: d.assemblyName,
        partNumber: d.partNumber,
        ward: d.ward,
        booth: d.booth,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      });
    }
  }

  await mongoose.disconnect();
}

inspectExcelVoters();
