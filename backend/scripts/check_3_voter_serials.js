const mongoose = require('mongoose');

async function checkBheetaVoters() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  // Let's inspect voters:
  // 1. SNE0151910 (सीता)
  // 2. SNE1226919 (मदन लाल)
  // 3. KDY0910042 (लहरी)
  
  const v1 = await db.collection('members').findOne({ voterId: 'SNE0151910' });
  const v2 = await db.collection('members').findOne({ voterId: 'SNE1226919' });
  const v3 = await db.collection('members').findOne({ voterId: 'KDY0910042' });

  console.log('SNE0151910 (सीता):', {
    voterSerial: v1.voterSerial,
    wardVoterSerial: v1.wardVoterSerial,
    wardSerialMap: v1.wardSerialMap,
    partNumber: v1.partNumber,
    wardNumber: v1.wardNumber,
    hasAssemblyMembership: v1.hasAssemblyMembership
  });

  console.log('SNE1226919 (मदन लाल):', {
    voterSerial: v2.voterSerial,
    wardVoterSerial: v2.wardVoterSerial,
    wardSerialMap: v2.wardSerialMap,
    partNumber: v2.partNumber,
    wardNumber: v2.wardNumber,
    hasAssemblyMembership: v2.hasAssemblyMembership
  });

  console.log('KDY0910042 (लहरी):', {
    voterSerial: v3.voterSerial,
    wardVoterSerial: v3.wardVoterSerial,
    wardSerialMap: v3.wardSerialMap,
    partNumber: v3.partNumber,
    wardNumber: v3.wardNumber,
    hasAssemblyMembership: v3.hasAssemblyMembership
  });

  await mongoose.disconnect();
}

checkBheetaVoters().catch(console.error);
