const fs = require('fs');
const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017';

mongoose.connect(uri).then(async () => {
  const admin = new mongoose.mongo.Admin(mongoose.connection.db);
  const dbs = await admin.listDatabases();
  console.log('Databases:', dbs.databases.map(d => d.name));
  for (const dbInfo of dbs.databases) {
    const conn = mongoose.connection.useDb(dbInfo.name);
    const Member = conn.model('Member', new mongoose.Schema({}, { strict: false }));
    const count = await Member.countDocuments().catch(() => 0);
    console.log(`DB ${dbInfo.name} Member count: ${count}`);
    if (dbInfo.name === 'political_crm') {
      const all = await Member.find({}).lean();
      console.log('Total in political_crm:', all.length);
      for (const v of all) {
        console.log(`EPIC: ${v.voterId} | Name: ${v.name} | House: ${v.houseNumber} | Card: ${v.ocrCardImage || v.cardImage}`);
      }
    }

  }
  process.exit(0);
}).catch(console.error);
