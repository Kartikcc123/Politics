const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

function cleanHindiText(str) {
  if (!str) return '';
  let s = str.trim();

  // Strip leading/trailing symbols, colons, visargas, quotes, digits, hyphens
  s = s.replace(/^[ः:;\.\,\-\_\?\!\@\#\$\%\^\*\(\)\+\=\\\/\{\}\[\]\|~`<>"'\s\d]+/, '');
  s = s.replace(/[ः:;\.\,\-\_\?\!\@\#\$\%\^\*\(\)\+\=\\\/\{\}\[\]\|~`<>"'\s\d]+$/, '');

  // Remove stray visarga inside words like "ः "
  s = s.replace(/ः\s*/g, '');

  // Fix OCR glyph corruptions
  s = s.replace(/स्ोंहन/g, 'सोहन');
  s = s.replace(/सोंहन/g, 'सोहन');
  s = s.replace(/संत्रोंक/g, 'संतोक');
  s = s.replace(/मोवन/g, 'मोहन');
  s = s.replace(/भैँवर/g, 'भंवर');
  s = s.replace(/भैंवर/g, 'भंवर');
  s = s.replace(/अमस्खंदं/g, 'अमरचंद');
  s = s.replace(/खुनिल/g, 'सुनील');
  s = s.replace(/बचन्द्र/g, 'चन्द्र');
  s = s.replace(/बचन्द/g, 'चन्द');
  s = s.replace(/गुणेश/g, 'गणेश');
  s = s.replace(/अणलछी/g, 'अणछी');
  s = s.replace(/सायरदेदी/g, 'सायर देवी');
  s = s.replace(/देदी$/g, 'देवी');
  s = s.replace(/देदी\s/g, 'देवी ');
  s = s.replace(/छगुदेवी/g, 'छगू देवी');
  s = s.replace(/छोटु\b/g, 'छोटू');
  s = s.replace(/बालु\b/g, 'बालू');
  s = s.replace(/चान्दमों/g, 'चांद मोहम्मद');
  s = s.replace(/नर्वदा/g, 'नर्मदा');
  s = s.replace(/प्रतापीदेवी/g, 'प्रतापी देवी');
  s = s.replace(/सायरदेवी/g, 'सायर देवी');
  s = s.replace(/केसीदेवी/g, 'केसी देवी');
  s = s.replace(/सुखदेवी/g, 'सुख देवी');
  s = s.replace(/सुन्दरदेवी/g, 'सुन्दर देवी');
  s = s.replace(/नाराणीदेवी/g, 'नारायणी देवी');
  s = s.replace(/राजीदेवी/g, 'राजी देवी');
  s = s.replace(/सन्तु देवी/g, 'संतू देवी');
  s = s.replace(/लेहरू/g, 'लहरू');
  s = s.replace(/नातूलाल/g, 'नाथू लाल');
  s = s.replace(/भैरलाल/g, 'भंवर लाल');
  s = s.replace(/पपुलाल/g, 'पप्पू लाल');
  s = s.replace(/केसुराम/g, 'केसूराम');
  s = s.replace(/सिह\b/g, 'सिंह');
  s = s.replace(/कन्वर\b/g, 'कंवर');
  s = s.replace(/कवँर\b/g, 'कंवर');
  s = s.replace(/लाडदेवी/g, 'लाड देवी');
  s = s.replace(/पानीदेवी/g, 'पानी देवी');
  s = s.replace(/केसरदेवी/g, 'केसर देवी');
  s = s.replace(/कंचनदेवी/g, 'कंचन देवी');
  s = s.replace(/चंपादेवी/g, 'चंपा देवी');
  s = s.replace(/प्यारीदेवी/g, 'प्यारी देवी');
  s = s.replace(/शान्ति/g, 'शांति');
  s = s.replace(/सन्तोष/g, 'संतोष');
  s = s.replace(/मन्जू/g, 'मंजू');

  // Clean double spaces
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function inferCaste(sectionName, name, guardianName) {
  const sec = sectionName || '';
  const fullText = `${name || ''} ${guardianName || ''}`;

  // 1. By Section Mohalla
  if (/जाटो|जाट\b/i.test(sec)) return 'जाट';
  if (/कुम्हार|कुमावत|प्रजापत/i.test(sec)) return 'प्रजापत';
  if (/तेली/i.test(sec)) return 'तेली';
  if (/गाडरी|सिरवी|सीरवी/i.test(sec)) return 'गाडरी';
  if (/छीपा|छीपों|छीपो/i.test(sec)) return 'छीपा';
  if (/रेगर|रैगर/i.test(sec)) return 'रेगर';
  if (/खटीक/i.test(sec)) return 'खटीक';
  if (/हरीजन|हरिजन/i.test(sec)) return 'हरिजन';
  if (/पुरोहित|ब्राह्मण/i.test(sec)) return 'ब्राह्मण';
  if (/बलाई/i.test(sec)) return 'बलाई';
  if (/सुथार/i.test(sec)) return 'सुथार';
  if (/माली/i.test(sec)) return 'माली';
  if (/नाई|सेन/i.test(sec)) return 'सेन';
  if (/धोबी/i.test(sec)) return 'धोबी';
  if (/भील/i.test(sec)) return 'भील';
  if (/नायक/i.test(sec)) return 'नायक';
  if (/सोनी/i.test(sec)) return 'सोनी';

  // 2. By Name / Surnames
  if (/शर्मा|जोशी|व्यास|तिवारी|शुक्ला|द्विवेदी|उपाध्याय|मिश्रा|पाण्डेय|पांडे|भट्ट|पाठक|ओझा|दाधीच|गौतम|पुरोहित|शृंगी|नागर|पण्ड्या|पण्डित|कौशिक|पालीवाल/i.test(fullText)) return 'ब्राह्मण';
  if (/सिंह|राठौड़|चौहान|राणावत|सिसोदिया|भाटी|शक्तावत|सोलंकी|परमार|पवार|हाड़ा|देवड़ा|बन्ना/i.test(fullText)) return 'राजपूत';
  if (/जाट|चौधरी|ताखड़|बेनीवाल|गोदारा|कस्वां|जाखड़/i.test(fullText)) return 'जाट';
  if (/गुर्जर|पोसवाल|बैसला|धाबाई|कटाना|चावड़ा/i.test(fullText)) return 'गुर्जर';
  if (/जैन|पोरवाल|शाह|मेहता|कोठारी|लोढ़ा|बाबेल|बाफना|गांधी|संचेती|रांका|सिंघवी|बोहरा|नोलखा|गोखरू|भण्डारी|कावडिया/i.test(fullText)) return 'जैन';
  if (/कुम्हार|कुमावत|प्रजापत/i.test(fullText)) return 'प्रजापत';
  if (/माली|सैनी|मौर्य/i.test(fullText)) return 'माली';
  if (/सुथार|जांगिड़/i.test(fullText)) return 'सुथार';
  if (/सोनी|स्वर्णकार/i.test(fullText)) return 'सोनी';
  if (/तेली|साहू|मोदी/i.test(fullText)) return 'तेली';
  if (/मेघवाल|बलाई|बैरवा|सालवी/i.test(fullText)) return 'मेघवाल';
  if (/रेगर|रैगर/i.test(fullText)) return 'रेगर';
  if (/खटीक/i.test(fullText)) return 'खटीक';
  if (/सेन|नाई/i.test(fullText)) return 'सेन';
  if (/लोहार|लौहार/i.test(fullText)) return 'लोहार';
  if (/खां|खान|मोहम्मद|अंसारी|कुरैशी|शेख|पठान|मुमताज|सलीम|फिरोज|यूनुस|हिना|मुस्कान|सुहेल|अहमद/i.test(fullText)) return 'मुस्लिम';

  return 'अन्य';
}

function getWardNumber(partNumber, sectionNumber) {
  const p = String(partNumber);
  const sec = String(sectionNumber || '');
  
  if (p === '112') {
    if (sec === '1' || sec === '4') return '1';
    return '2';
  }
  if (p === '113') {
    if (sec === '1' || sec === '3') return '3';
    return '4';
  }
  if (p === '114') {
    if (sec === '1' || sec === '5' || sec === '6' || sec === '32') return '5';
    return '6';
  }
  if (p === '115') {
    if (sec === '0' || sec === '1' || sec === '2' || sec === '3') return '7';
    return '8';
  }
  if (p === '116') {
    if (sec === '1' || sec === '2' || sec === '3') return '9';
    return '10';
  }
  if (p === '117') {
    if (sec === '1' || sec === '5' || sec === '8' || sec === '9') return '11';
    return '12';
  }
  if (p === '118') {
    if (sec === '6') return '14';
    return '13';
  }
  if (p === '119') {
    if (sec === '1') return '15';
    if (sec === '2' || sec === '4') return '16';
    return '17';
  }
  return '1';
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const parts = ['112', '113', '114', '115', '116', '117', '118', '119'];
  console.log('Connecting and preparing updates for Koshithal (parts 112 to 119)...');

  // Clean up any incomplete ward entry where number is null/missing
  await db.collection('wards').deleteMany({ number: { $in: [null, undefined, ''] } });

  // 1. Ensure all 17 Wards exist in 'wards' collection
  console.log('\n--- Ensuring 17 Wards exist in wards collection for Sahada / Koshithal ---');
  for (let w = 1; w <= 17; w++) {
    const wardNum = String(w);
    const existing = await db.collection('wards').findOne({ number: wardNum });
    if (!existing) {
      await db.collection('wards').insertOne({
        name: `Ward ${wardNum}`,
        number: wardNum,
        wardNumber: wardNum,
        area: 'सहाड़ा',
        panchayatSamiti: 'सहाड़ा',
        gramPanchayat: 'कोशिथल',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Inserted Ward ${wardNum} into wards collection.`);
    } else {
      console.log(`Ward ${wardNum} already exists:`, existing.name);
    }
  }

  // 2. Process members in parts 112 to 119
  const cursor = db.collection('members').find({ partNumber: { $in: parts } });
  let count = 0;
  let nameFixed = 0;
  let casteAssigned = 0;
  const bulkOps = [];

  while (await cursor.hasNext()) {
    const m = await cursor.next();
    count++;

    const newName = cleanHindiText(m.name);
    const newGuardian = cleanHindiText(m.guardianName);
    let newCaste = (m.caste && m.caste.trim().length > 0) ? m.caste.trim() : inferCaste(m.sectionName, newName, newGuardian);
    const wardNum = getWardNumber(m.partNumber, m.sectionNumber);

    // Fix sectionName if contains कोशीधल
    let cleanSection = (m.sectionName || '').replace(/कोशीधल/g, 'कोशीथल').replace(/कोशीथधल/g, 'कोशीथल');

    if (newName !== m.name || newGuardian !== m.guardianName) {
      nameFixed++;
    }
    if (!m.caste || m.caste.trim().length === 0) {
      casteAssigned++;
    }

    const setObj = {
      name: newName,
      guardianName: newGuardian,
      caste: newCaste,
      gramPanchayat: 'कोशिथल',
      village: (m.sectionName && m.sectionName.includes('अरनोटा')) ? 'अरनोटा' : 'कोशिथल',
      panchayatSamiti: 'सहाड़ा',
      tehsil: 'सहाड़ा',
      wardNumber: wardNum,
      panchayatSamitiWard: wardNum,
      municipalWardNumbers: [wardNum],
      sectionName: cleanSection
    };

    bulkOps.push({
      updateOne: {
        filter: { _id: m._id },
        update: { $set: setObj }
      }
    });

    if (bulkOps.length >= 500) {
      await db.collection('members').bulkWrite(bulkOps);
      bulkOps.length = 0;
      process.stdout.write(`Processed ${count} / 5798...\r`);
    }
  }

  if (bulkOps.length > 0) {
    await db.collection('members').bulkWrite(bulkOps);
  }

  console.log(`\n\nDONE! Processed: ${count} members.`);
  console.log(`Names corrected: ${nameFixed}`);
  console.log(`Castes populated: ${casteAssigned}`);

  // Verification: counts per ward 1 to 17
  console.log('\n--- Ward counts in Koshithal (parts 112 to 119) ---');
  for (let w = 1; w <= 17; w++) {
    const wStr = String(w);
    const wc = await db.collection('members').countDocuments({ partNumber: { $in: parts }, wardNumber: wStr });
    console.log(`Ward ${wStr}: ${wc} voters`);
  }

  // Verification: Castes in Koshithal
  const distinctKoshCastes = await db.collection('members').distinct('caste', { partNumber: { $in: parts } });
  console.log('\nCastes now in Koshithal:', distinctKoshCastes);

  await client.close();
}

run().catch(console.error);
