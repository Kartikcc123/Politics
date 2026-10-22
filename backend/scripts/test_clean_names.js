const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const parts = ['112', '113', '114', '115', '116', '117', '118', '119'];
  const members = await db.collection('members').find({ partNumber: { $in: parts } }).toArray();
  console.log('Total members in Koshithal:', members.length);

  // Collect frequency of various suspicious tokens / patterns
  const nameErrors = [];
  for (const m of members) {
    const origName = m.name || '';
    const origGuardian = m.guardianName || '';
    
    // Check if name has suspicious patterns:
    // 1. leading punctuation/symbols like 'ः ', ':', ';', '.', ',', '-', '?'
    // 2. broken matras e.g. 'स्ों', 'संत्रों', 'भैँ', 'अमस्', 'बचन्द्र', etc.
    // 3. stray latin chars or digits
    // 4. weird spacing or unclosed characters
    const cleanName = cleanHindiName(origName);
    const cleanGuardian = cleanHindiName(origGuardian);

    if (cleanName !== origName || cleanGuardian !== origGuardian) {
      nameErrors.push({
        id: m._id,
        voterId: m.voterId,
        beforeName: origName,
        afterName: cleanName,
        beforeGuardian: origGuardian,
        afterGuardian: cleanGuardian
      });
    }
  }

  console.log(`Found ${nameErrors.length} records needing correction!`);
  console.log('\nSample 40 corrections:');
  nameErrors.slice(0, 40).forEach(e => {
    console.log(`[${e.voterId}] Name: "${e.beforeName}" -> "${e.afterName}" | Guardian: "${e.beforeGuardian}" -> "${e.afterGuardian}"`);
  });

  await client.close();
}

function cleanHindiName(str) {
  if (!str) return '';
  let s = str.trim();

  // Remove leading/trailing symbols, colons, visargas, quotes, digits, hyphens
  s = s.replace(/^[ः:;\.\,\-\_\?\!\@\#\$\%\^\*\(\)\+\=\\\/\{\}\[\]\|~`<>"'\s\d]+/, '');
  s = s.replace(/[ः:;\.\,\-\_\?\!\@\#\$\%\^\*\(\)\+\=\\\/\{\}\[\]\|~`<>"'\s\d]+$/, '');

  // Remove stray visarga inside words like "ः "
  s = s.replace(/ः\s*/g, '');

  // Fix common OCR glyph corruptions
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
  s = s.replace(/छगुदेवी/g, 'छगू देवी');
  s = s.replace(/छोटु/g, 'छोटू');
  s = s.replace(/बालु/g, 'बालू');
  s = s.replace(/चान्दमों/g, 'चांद मोहम्मद');
  s = s.replace(/कलाल/g, 'कल्याण');
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

  // Clean double spaces
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

run().catch(console.error);
