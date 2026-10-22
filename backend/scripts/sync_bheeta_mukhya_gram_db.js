const mongoose = require('mongoose');

async function syncBheetaMukhyaGram() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const members = mongoose.connection.db.collection('members');

  const wardUpdates = [
    { ward: '1', mukhyaGram: 'भींटा - सेमलाट' },
    { ward: '2', mukhyaGram: 'भींटा' },
    { ward: '3', mukhyaGram: 'भींटा' },
    { ward: '4', mukhyaGram: 'सरेवडी' },
    { ward: '5', mukhyaGram: 'सरेवडी' },
    { ward: '6', mukhyaGram: 'सरेवडी का बाडीया', village: 'सरेवडी का बाडीया' },
    { ward: '7', mukhyaGram: 'जोरावरपुरा' },
    { ward: '8', mukhyaGram: 'भटेवर' },
    { ward: '9', mukhyaGram: 'भटेवर' },
    { ward: '10', mukhyaGram: 'भटेवर' },
    { ward: '11', mukhyaGram: 'रूपा का खेडा' }
  ];

  for (const item of wardUpdates) {
    const filter = {
      gramPanchayat: { $in: ['भीटा', 'भींटा'] },
      wardNumber: item.ward
    };

    const updateDoc = {
      $set: {
        mukhyaGram: item.mukhyaGram
      }
    };
    if (item.village) {
      updateDoc.$set.village = item.village;
    }

    const res = await members.updateMany(filter, updateDoc);
    console.log(`Ward ${item.ward} (${item.mukhyaGram}): Matched ${res.matchedCount}, Modified ${res.modifiedCount}`);
  }

  // Also check if any other voters in Bheeta need gramPanchayat spelling alignment
  console.log('Done syncing Bheeta Mukhya Gram!');
  process.exit(0);
}

syncBheetaMukhyaGram().catch(console.error);
