const mongoose = require('mongoose');
const fs = require('fs');

async function findMangledNames() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  // Find names/guardians that match suspicious patterns
  const cursor = Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: /ाि|िद|दिर|ंल|लि|जम|रमला|उदज|मारत|ाति|समंत|चदिर|सतजा|कालल|भूा|कहि|बालु|डालु|शलारम|अमा|अमार|रिबि|हा लाल|भंार|कत षण|शातंि|गाजतल|अमूा|सुार|साचि|इरि|बाचि|भलल/ },
      { guardianName: /ाि|िद|दिर|ंल|लि|जम|रमला|उदज|मारत|ाति|समंत|चदिर|सतजा|कालल|भूा|कहि|बालु|डालु|शलारम|अमा|अमार|रिबि|हा लाल|भंार|कत षण|शातंि|गाजतल|अमूा|सुार|साचि|इरि|बाचि|भलल/ }
    ]
  }).select('name guardianName voterId').lean();

  const names = new Set();
  const guardians = new Set();

  for await (const doc of cursor) {
    if (doc.name) names.add(doc.name);
    if (doc.guardianName) guardians.add(doc.guardianName);
  }

  console.log(`Found ${names.size} distinct names and ${guardians.size} distinct guardians with patterns.`);
  fs.writeFileSync('scripts/mangled_names_list.json', JSON.stringify({ names: Array.from(names), guardians: Array.from(guardians) }, null, 2));

  await mongoose.disconnect();
}

findMangledNames().catch(console.error);
