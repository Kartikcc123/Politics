const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/?appName=Cluster0';

const glyphReplacements = [
  // Multi-word phrases
  { from: /पेम\s*चादं\s*कु\s*मारत/g, to: 'प्रेम चन्द कुमावत' },
  { from: /पेम\s*चादं/g, to: 'प्रेम चन्द' },
  { from: /गोाधन\s*दास/g, to: 'गोवर्धन दास' },
  { from: /शजाम\s*लाल/g, to: 'श्याम लाल' },
  { from: /नि\s*द\s*लाल/g, to: 'नन्द लाल' },
  { from: /उदज\s*राम/g, to: 'उदय राम' },
  { from: /उदज\s*लाल/g, to: 'उदय लाल' },
  { from: /अम\s*बा\s*लाल/g, to: 'अम्बा लाल' },
  { from: /अमूा\s*लाल/g, to: 'अमरा लाल' },
  { from: /हा\s*लाल/g, to: 'हीरा लाल' },
  { from: /समंत\s*लाल/g, to: 'सम्पत लाल' },
  { from: /मगलि\s*राम/g, to: 'मांगी राम' },
  { from: /मगलि\s*लाल/g, to: 'मांगी लाल' },
  { from: /सुार\s*लाल/g, to: 'सुगन लाल' },
  { from: /कहिजिर\s*लाल/g, to: 'कन्हैया लाल' },
  { from: /कहिभजा\s*लाल/g, to: 'कन्हैया लाल' },
  { from: /की\s*लाश\s*चन्द्र/g, to: 'कैलाश चन्द्र' },
  { from: /की\s*लाश/g, to: 'कैलाश' },
  { from: /कमल\s*काति/g, to: 'कमलकांत' },
  { from: /राजेच\s*मार/g, to: 'राजेश कुमार' },
  { from: /जगदीश\s*लोहार\s*शातंि/g, to: 'जगदीश लोहार' },
  { from: /गाजतल\s*लोहार\s*लोहार/g, to: 'गायत्री लोहार' },
  { from: /गाजतल\s*लोहार/g, to: 'गायत्री लोहार' },
  { from: /गाजतल/g, to: 'गायत्री' },

  // Specific OCR corruption patterns identified in Koshithal
  { from: /सन््तोधी/g, to: 'संतोषी' },
  { from: /लक्ठमण/g, to: 'लक्ष्मण' },
  { from: /सीहन\s*लाल/g, to: 'सोहन लाल' },
  { from: /सीहन/g, to: 'सोहन' },
  { from: /लह॒रू/g, to: 'लहरू' },
  { from: /गोंकल/g, to: 'गोकुल' },
  { from: /पाससी/g, to: 'पारसी' },
  { from: /दुदाराम\s*तेली\s*दुदाराम\s*तेली/g, to: 'दुदाराम तेली' },
  { from: /गायत्री\s*लोहार\s*लोहार/g, to: 'गायत्री लोहार' },

  // SEC font artifacts
  { from: /\bइरि\b/g, to: 'इना' },
  { from: /\bइरि देवी\b/g, to: 'इना देवी' },
  { from: /\bअफसाचि\b/g, to: 'अफसाना' },
  { from: /\bबाचि\b/g, to: 'बानो' },
  { from: /\bसाचिद\s*र\s*क\s*ल\b/g, to: 'शान्ति देवी' },
  { from: /\bसाचिडल\b/g, to: 'शान्ति देवी' },
  { from: /\bसाचि\s*देवी\b/g, to: 'शान्ति देवी' },
  { from: /\bसाचि\s*भलल\b/g, to: 'शान्ति भील' },
  { from: /\bसाचि\s*कु\s*म\s*हार\b/g, to: 'शान्ति कुम्हार' },
  { from: /\bसाचि\b/g, to: 'शान्ति' },
  { from: /\bभलल\b/g, to: 'भील' },
  { from: /\bचन\b/g, to: 'चन्द्र' },
  { from: /\bचनद\b/g, to: 'चन्द्र' },
  { from: /\bचनन\b/g, to: 'चन्द्र' },
  { from: /\bदकरल\b/g, to: 'देवी' },
  { from: /\bदक\s*रल\b/g, to: 'देवी' },
  { from: /\bलरल\b/g, to: 'लाल' },
  { from: /\bलरलल\b/g, to: 'लाली' },
  { from: /\bकरबरर\b/g, to: 'कंवर' },
  { from: /\bकर\s*बरर\b/g, to: 'कंवर' },
  { from: /\bबरई\b/g, to: 'बाई' },
  { from: /\bकचमरर\b/g, to: 'कुमार' },
  { from: /\bकपमरर\b/g, to: 'कुमार' },
  { from: /\bकचमररत\b/g, to: 'कुमावत' },
  { from: /\bकपमररत\b/g, to: 'कुमावत' },
  { from: /\bलसह\b/g, to: 'सिंह' },
  { from: /\bलसपह\b/g, to: 'सिंह' },
  { from: /\bसपसरर\b/g, to: 'सालवी' },
  { from: /\bसरलरल\b/g, to: 'सालवी' },
  { from: /\bभपरर\b/g, to: 'भंवर' },
  { from: /\bभबरर\b/g, to: 'भंवर' },
  { from: /\bभनर\b/g, to: 'भंवर' },

  // General single-word patterns
  { from: /कु\s*मारत/g, to: 'कुमावत' },
  { from: /गोाधन/g, to: 'गोवर्धन' },
  { from: /गोािदिर/g, to: 'गोविन्द' },
  { from: /गोािदि/g, to: 'गोविन्द' },
  { from: /गोाि/g, to: 'गोविन्द' },
  { from: /सुदिर/g, to: 'सुधीर' },
  { from: /चादंल/g, to: 'चांदमल' },
  { from: /भगलिराम/g, to: 'बगदीराम' },
  { from: /मगलिराम/g, to: 'मांगीराम' },
  { from: /मगलि/g, to: 'मांगी' },
  { from: /नि\s*द/g, to: 'नन्द' },
  { from: /निदा/g, to: 'नन्दा' },
  { from: /निदु/g, to: 'नन्दू' },
  { from: /शजाम/g, to: 'श्याम' },
  { from: /उरमला/g, to: 'उर्मिला' },
  { from: /अम\s*बा/g, to: 'अम्बा' },
  { from: /उदज/g, to: 'उदय' },
  { from: /पेम/g, to: 'प्रेम' },
  { from: /कमलेाति/g, to: 'कमलकांत' },
  { from: /दुगार/g, to: 'दुर्गा' },
  { from: /समंतल/g, to: 'सम्पति' },
  { from: /समंत/g, to: 'सम्पत' },
  { from: /चदिर/g, to: 'चन्द्रा' },
  { from: /कमेलश/g, to: 'कमलेश' },
  { from: /लोेक\s*श/g, to: 'लोकेश' },
  { from: /सतजािराजण/g, to: 'सत्यनारायण' },
  { from: /कालल/g, to: 'काली' },
  { from: /भूा/g, to: 'भूरा' },
  { from: /कहिभजा/g, to: 'कन्हैया' },
  { from: /कहिजिर/g, to: 'कन्हैया' },
  { from: /बालुारम/g, to: 'बालूराम' },
  { from: /डालुारम/g, to: 'डालूराम' },
  { from: /बालु/g, to: 'बालू' },
  { from: /डालु/g, to: 'डालू' },
  { from: /शलारम/g, to: 'शोभाराम' },
  { from: /अमा\s*चन्द्र/g, to: 'अमर चन्द' },
  { from: /अमा/g, to: 'अमर' },
  { from: /अमार/g, to: 'अमरा' },
  { from: /अमूा/g, to: 'अमरा' },
  { from: /रिबिराम/g, to: 'रविराम' },
  { from: /भंारल/g, to: 'भंवरी' },
  { from: /कत\s*षण/g, to: 'कृष्ण' },
  { from: /कत\s*षणा/g, to: 'कृष्णा' },
  { from: /शातंि/g, to: 'शान्ति' },
  { from: /सुार/g, to: 'सुगन' },
  { from: /धािरज/g, to: 'धीरज' },
  { from: /पाजल/g, to: 'पायल' },
  { from: /बािरगल/g, to: 'बागरिया' },
  { from: /पुषंा/g, to: 'पुष्पा' },
  { from: /जंारल/g, to: 'जवारी' },
  { from: /लडंल/g, to: 'लाडली' },
  { from: /भगारन/g, to: 'भगवान' },
  { from: /पालि/g, to: 'पाली' },
  { from: /भाराि/g, to: 'भवानी' },
  { from: /गोलं/g, to: 'गोपी' },
  { from: /बिमला/g, to: 'विमला' },
  { from: /सुखल/g, to: 'सुखी' },
  { from: /गुलाबल/g, to: 'गुलाबी' },
  { from: /कायि/g, to: 'काली' },
  { from: /लादल/g, to: 'लादी' },
  { from: /किबि/g, to: 'किशन' },
  { from: /चुलि/g, to: 'चुन्नी' },
  { from: /मोहल/g, to: 'मोहिनी' },
  { from: /शाता/g, to: 'शान्ति' },
  { from: /कचरल/g, to: 'कचरी' },
  { from: /कक\s*सर/g, to: 'केसर' },
  { from: /ककसर/g, to: 'केसर' },
  { from: /प\s*काश/g, to: 'प्रकाश' },
  { from: /पकाश/g, to: 'प्रकाश' },
  { from: /प\s*ताप/g, to: 'प्रताप' },
  { from: /पताप/g, to: 'प्रताप' },
  { from: /प\s*भू/g, to: 'प्रभु' },
  { from: /पभू/g, to: 'प्रभु' },
  { from: /प\s*मोद/g, to: 'प्रमोद' },
  { from: /पमोद/g, to: 'प्रमोद' }
];

function cleanHindiName(raw) {
  if (!raw) return '';
  let str = String(raw)
    .replace(/Photo\s*(?:is)?\s*Available/gi, '')
    .replace(/Available/gi, '')
    .replace(/Photo/gi, '')
    .replace(/[0-9]/g, '')
    .replace(/[;:,.\-_\*\#\$\@\^\!\|\~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip prefix words like "नाम", "पिता का नाम", "पति का नाम", "माता का नाम"
  str = str.replace(/^(?:निर्वाचक\s*का\s*)?नाम\s*[:\s]*/i, '');
  str = str.replace(/^(?:पिता|पति|माता)\s*का\s*नाम\s*[:\s]*/i, '');
  str = str.replace(/^(?:पिता|पति|माता)\s*[:\s]*/i, '');

  for (const r of glyphReplacements) {
    str = str.replace(r.from, r.to);
  }

  // Deduplicate words if identical name is repeated (e.g. "दुदाराम दुदाराम")
  const parts = str.split(' ');
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const half = parts.length / 2;
    if (parts.slice(0, half).join(' ') === parts.slice(half).join(' ')) {
      str = parts.slice(0, half).join(' ');
    }
  }

  return str.replace(/\s+/g, ' ').trim();
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  console.log('--- Cleaning and Perfecting All Voter Names in Koshithal (parts 112 to 119) ---');
  const cursor = db.collection('members').find({
    partNumber: { $in: ['112','113','114','115','116','117','118','119'] }
  });

  let count = 0;
  let fixedCount = 0;
  const bulkOps = [];

  while (await cursor.hasNext()) {
    const m = await cursor.next();
    count++;

    const newName = cleanHindiName(m.name);
    const newGuardian = cleanHindiName(m.guardianName);

    const changed = (newName && newName !== m.name) || (newGuardian && newGuardian !== m.guardianName);

    if (changed) {
      fixedCount++;
      const updateDoc = {
        name: newName || m.name,
        guardianName: newGuardian || m.guardianName,
        relativeName: newGuardian || m.guardianName
      };

      // Rebuild search keys so in-app search works with updated clean names
      const exactTokens = [
        updateDoc.name,
        (m.voterId || '').toLowerCase(),
        String(m.voterSerial || m.serialNumber || ''),
        updateDoc.guardianName,
        String(m.houseNumber || ''),
        String(m.wardNumber || ''),
        m.sectionName || '',
        m.partNumber || ''
      ].filter(Boolean);

      updateDoc.searchExact = exactTokens;
      updateDoc.searchNameKeys = [updateDoc.name];
      updateDoc.searchGuardianKeys = [updateDoc.guardianName];
      updateDoc.searchText = exactTokens.join(' ').toLowerCase();

      bulkOps.push({
        updateOne: {
          filter: { _id: m._id },
          update: { $set: updateDoc }
        }
      });

      if (bulkOps.length >= 500) {
        await db.collection('members').bulkWrite(bulkOps);
        bulkOps.length = 0;
        console.log(`Updated ${fixedCount} corrected voter names so far...`);
      }
    }
  }

  if (bulkOps.length > 0) {
    await db.collection('members').bulkWrite(bulkOps);
  }

  console.log(`\nCompleted! Processed ${count} voters in Koshithal. Corrected ${fixedCount} voter names.`);
  await client.close();
}

run().catch(console.error);
