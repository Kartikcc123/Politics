const mongoose = require('mongoose');

async function testExtraction() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  const cursor = db.collection('members').find({ searchExact: { $exists: true, $ne: [] } }).limit(50);
  let count = 0;
  let parsed = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    count++;
    const arr = doc.searchExact || [];
    
    // In searchExact:
    // Index 0: name
    // Index 1: epic
    // Index 2: voterSerial (numeric string e.g. "545", "3", "21")
    // Last or second to last element: partNumber (numeric string after "सहाडा सामान्य" or "179")
    
    let originalSerial = '';
    let originalPart = '';
    
    // Find serial (usually at index 2 if numeric)
    if (arr.length >= 3 && /^\d+$/.test(arr[2])) {
      originalSerial = arr[2];
    }
    
    // Find partNumber (usually after '179' or 'सहाडा सामान्य' or last numeric)
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === 'सहाडा सामान्य' || arr[i] === 'सहाड़ा' || arr[i] === '179') {
        for (let j = i + 1; j < arr.length; j++) {
          if (/^\d+$/.test(arr[j]) && parseInt(arr[j], 10) <= 300) {
            originalPart = arr[j];
          }
        }
      }
    }

    if (originalSerial) parsed++;
    
    if (count <= 15) {
      console.log(`[${doc.voterId}] Name: ${doc.name} -> Extracted Serial: ${originalSerial}, Part: ${originalPart} (Current: vSerial=${doc.voterSerial}, part=${doc.partNumber})`);
    }
  }

  console.log(`Total checked: ${count}, Parsed valid original serials: ${parsed}`);
  await mongoose.disconnect();
}

testExtraction().catch(console.error);
