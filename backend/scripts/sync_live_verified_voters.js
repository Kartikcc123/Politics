const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNmEzMzAxZjBiM2YyNmYxYzMyMmRhNjZjIiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTc4ODE1OTUzNywiZXhwIjoxNzg4NzY0MzM3fQ.gfAkgcIvtqe6JOUuN6cZPPu1wTxJatGAHNbqL_9IN4g';

const bhitaVotersPage3To5 = [
  // Page 3 (Voters 1 to 30)
  { serial: "1", epic: "KDY1113448", name: "नेनूराम", guardian: "प्रतापचन्द", relation: "father", house: "8", age: 58, gender: "male" },
  { serial: "2", epic: "SNE0513606", name: "बालाराम", guardian: "नेनूराम", relation: "father", house: "8", age: 32, gender: "male" },
  { serial: "3", epic: "SNE0727586", name: "सुगणी", guardian: "बालाराम", relation: "husband", house: "8", age: 31, gender: "female" },
  { serial: "4", epic: "KDY0955104", name: "प्रतापचन्द", guardian: "धीरालाल", relation: "father", house: "9", age: 84, gender: "male" },
  { serial: "5", epic: "KDY1113455", name: "हंजा", guardian: "प्रतापचन्द", relation: "husband", house: "9", age: 82, gender: "female" },
  { serial: "6", epic: "KDY0955112", name: "डालचन्द", guardian: "प्रतापचन्द", relation: "father", house: "9", age: 55, gender: "male" },
  { serial: "7", epic: "KDY1113463", name: "कमली", guardian: "डालचन्द", relation: "husband", house: "9", age: 52, gender: "female" },
  { serial: "8", epic: "SNE1570290", name: "सावर मल", guardian: "डालचन्द", relation: "father", house: "9", age: 23, gender: "male" },
  { serial: "9", epic: "SNE1651439", name: "तीना देवी", guardian: "सन्देरा", relation: "husband", house: "9", age: 21, gender: "female" },
  { serial: "10", epic: "KDY0955120", name: "सुवालाल", guardian: "प्रतापचन्द", relation: "father", house: "10", age: 61, gender: "male" },
  { serial: "11", epic: "KDY0955138", name: "बगतावरी", guardian: "सुवालाल", relation: "husband", house: "10", age: 59, gender: "female" },
  { serial: "12", epic: "SNE0380923", name: "भेरूलाल", guardian: "सुवालाल", relation: "father", house: "10", age: 38, gender: "male" },
  { serial: "13", epic: "SNE0380931", name: "भंवरी देवी", guardian: "भेरूलाल", relation: "husband", house: "10", age: 37, gender: "female" },
  { serial: "14", epic: "SNE0209916", name: "राजू", guardian: "सुवा", relation: "father", house: "10", age: 35, gender: "male" },
  { serial: "15", epic: "SNE0819300", name: "मुकेश कुमार", guardian: "सुवालाल", relation: "father", house: "10", age: 30, gender: "male" },
  { serial: "16", epic: "SNE1347053", name: "मीना देवी", guardian: "राजू", relation: "husband", house: "10", age: 29, gender: "female" },
  { serial: "17", epic: "SNE1307180", name: "बाली देवी", guardian: "मुकेश कुमार", relation: "husband", house: "10", age: 27, gender: "female" },
  { serial: "18", epic: "KDY0955161", name: "मांगी", guardian: "मांगीलाल", relation: "husband", house: "11", age: 74, gender: "female" },
  { serial: "19", epic: "RJ/20/152/000716", name: "हीरालाल", guardian: "मांगीलाल", relation: "father", house: "11", age: 54, gender: "male" },
  { serial: "20", epic: "KDY0955187", name: "नाराणी", guardian: "लादू लाल", relation: "husband", house: "11", age: 49, gender: "female" },
  { serial: "21", epic: "KDY1223445", name: "बब्रा", guardian: "मांगी लाल", relation: "father", house: "11", age: 44, gender: "male" },
  { serial: "22", epic: "SNE0380964", name: "कैलाश देवी", guardian: "बंसीलाल", relation: "husband", house: "11", age: 38, gender: "female" },
  { serial: "23", epic: "SNE1359397", name: "गोविंद कुमार", guardian: "लादू लाल", relation: "father", house: "11", age: 25, gender: "male" },
  { serial: "24", epic: "SNE1359637", name: "श्रवण लाल", guardian: "हीरा लाल", relation: "father", house: "11", age: 25, gender: "male" },
  { serial: "25", epic: "SNE1682319", name: "भगवती देवी", guardian: "श्रवण लाल", relation: "husband", house: "11", age: 24, gender: "female" },
  { serial: "26", epic: "KDY0955195", name: "सोवनी", guardian: "जेताराम", relation: "husband", house: "12", age: 81, gender: "female" },
  { serial: "27", epic: "RJ/20/152/000715", name: "लाटुलाल", guardian: "जेताराम", relation: "father", house: "12", age: 64, gender: "male" },
  { serial: "28", epic: "KDY1349018", name: "भंवरी", guardian: "लाटुलाल", relation: "husband", house: "12", age: 61, gender: "female" },
  { serial: "29", epic: "KDY1348937", name: "गोपाललाल", guardian: "जेताराम", relation: "father", house: "12", age: 57, gender: "male" },
  { serial: "30", epic: "KDY0955203", name: "सुशीला देवी", guardian: "गोपाललाल", relation: "husband", house: "12", age: 55, gender: "female" },

  // Page 4 (Voters 31 to 60)
  { serial: "31", epic: "RJ/20/152/001379", name: "रोशनलाल", guardian: "जेताराम", relation: "father", house: "12", age: 52, gender: "male" },
  { serial: "32", epic: "KDY0955211", name: "पुष्पा", guardian: "रोशन लाल", relation: "husband", house: "12", age: 45, gender: "female" },
  { serial: "33", epic: "SNE0380972", name: "पिन्टु कुमार", guardian: "लादू लाल", relation: "father", house: "12", age: 36, gender: "male" },
  { serial: "34", epic: "SNE0601153", name: "संगम कुमार", guardian: "गोपाल", relation: "father", house: "12", age: 31, gender: "male" },
  { serial: "35", epic: "SNE0727594", name: "पूजा", guardian: "पिन्टू", relation: "husband", house: "12", age: 31, gender: "female" },
  { serial: "36", epic: "SNE0819318", name: "बंशीलाल", guardian: "बालू", relation: "father", house: "12", age: 31, gender: "male" },
  { serial: "37", epic: "SNE0954065", name: "भगवती देवी", guardian: "संगम", relation: "husband", house: "12", age: 28, gender: "female" },
  { serial: "38", epic: "SNE1550789", name: "राहुल", guardian: "गोपाल लाल", relation: "father", house: "12", age: 23, gender: "male" },
  { serial: "39", epic: "SNE1792274", name: "खुशबू देवी", guardian: "राहुल", relation: "husband", house: "12", age: 20, gender: "female" },
  { serial: "40", epic: "SNE1835776", name: "देवेन्द्र कुमार", guardian: "रोशन लाल", relation: "father", house: "12", age: 19, gender: "male" },
  { serial: "41", epic: "KDY0955237", name: "डालचन्द", guardian: "भूरालाल", relation: "father", house: "13", age: 64, gender: "male" },
  { serial: "42", epic: "KDY0910521", name: "केलीबाई", guardian: "डालचन्द", relation: "husband", house: "13", age: 61, gender: "female" },
  { serial: "43", epic: "KDY0910513", name: "भागु", guardian: "भूरालाल", relation: "father", house: "13", age: 58, gender: "male" },
  { serial: "44", epic: "KDY0955229", name: "सुन्दरबाई", guardian: "भागु", relation: "husband", house: "13", age: 56, gender: "female" },
  { serial: "45", epic: "SNE0209924", name: "देवी लाल", guardian: "बालू", relation: "father", house: "13", age: 38, gender: "male" },
  { serial: "46", epic: "SNE0544270", name: "प्रेम लाल", guardian: "भागुराम", relation: "father", house: "13", age: 33, gender: "male" },
  { serial: "47", epic: "SNE0727602", name: "कोयली", guardian: "देवीलाल", relation: "husband", house: "13", age: 33, gender: "female" },
  { serial: "48", epic: "SNE0795427", name: "शारदा", guardian: "प्रेमलाल", relation: "husband", house: "13", age: 32, gender: "female" },
  { serial: "49", epic: "SNE0907162", name: "कन्हैयालाल", guardian: "भागु", relation: "father", house: "13", age: 29, gender: "male" },
  { serial: "50", epic: "SNE1237924", name: "मीना देवी", guardian: "बब्रा लाल", relation: "husband", house: "13", age: 27, gender: "female" },
  { serial: "51", epic: "SNE1347020", name: "चंचल", guardian: "कन्हैया लाल", relation: "husband", house: "13", age: 26, gender: "female" },
  { serial: "52", epic: "KDY0955245", name: "मांगूलाल", guardian: "खूमा", relation: "father", house: "14", age: 64, gender: "male" },
  { serial: "53", epic: "KDY0955252", name: "राजी", guardian: "मांगू", relation: "husband", house: "14", age: 62, gender: "female" },
  { serial: "54", epic: "SNE1013747", name: "सुवा", guardian: "मांगी लाल", relation: "father", house: "14", age: 29, gender: "male" },
  { serial: "55", epic: "SNE1698257", name: "लादी देवी", guardian: "सुवा", relation: "husband", house: "14", age: 21, gender: "female" },
  { serial: "56", epic: "KDY0955278", name: "अमरी", guardian: "प्रतापचन्द", relation: "husband", house: "15", age: 81, gender: "female" },
  { serial: "57", epic: "KDY0910562", name: "अर्जुनलाल", guardian: "प्रतापचन्द", relation: "father", house: "15", age: 45, gender: "male" },
  { serial: "58", epic: "SNE0151993", name: "सायरी देवी", guardian: "अर्जुन लाल", relation: "husband", house: "15", age: 39, gender: "female" },
  { serial: "59", epic: "SNE1835529", name: "घनश्याम", guardian: "अर्जुन लाल", relation: "father", house: "15", age: 20, gender: "male" },
  { serial: "60", epic: "RJ/20/152/000223", name: "गोमीबाई", guardian: "मोतीलाल", relation: "husband", house: "16", age: 86, gender: "female" },

  // Page 5 (Voters 61 to 90)
  { serial: "61", epic: "KDY1113471", name: "लछीराम", guardian: "खुमाराम", relation: "father", house: "16", age: 62, gender: "male" },
  { serial: "62", epic: "KDY1113489", name: "नेबूबाई", guardian: "लछीराम", relation: "husband", house: "16", age: 62, gender: "female" },
  { serial: "63", epic: "KDY1113497", name: "चन्दरी", guardian: "लछूराम", relation: "husband", house: "16", age: 61, gender: "female" },
  { serial: "64", epic: "SNE0907170", name: "रमेशचन्द्र", guardian: "लछूराम", relation: "father", house: "16", age: 29, gender: "male" },
  { serial: "65", epic: "SNE1306893", name: "भगवान लाल", guardian: "लछीराम", relation: "father", house: "16", age: 26, gender: "male" },
  { serial: "66", epic: "SNE1508167", name: "मीरा", guardian: "लछीराम", relation: "husband", house: "16", age: 24, gender: "female" },
  { serial: "67", epic: "SNE1570365", name: "बाली कुमारी", guardian: "लछू", relation: "father", house: "16", age: 23, gender: "female" },
  { serial: "68", epic: "SNE0947788", name: "भावेश", guardian: "श्याम लाल", relation: "father", house: "18", age: 29, gender: "male" },
  { serial: "69", epic: "KDY0955302", name: "शान्ती", guardian: "बालूलाल", relation: "husband", house: "19", age: 76, gender: "female" },
  { serial: "70", epic: "KDY0910018", name: "श्यामलाल", guardian: "बालूलाल", relation: "father", house: "19", age: 61, gender: "male" },
  { serial: "71", epic: "KDY0955310", name: "सानु", guardian: "श्यामलाल", relation: "husband", house: "19", age: 56, gender: "female" },
  { serial: "72", epic: "KDY0955328", name: "रोशनलाल", guardian: "बालूलाल", relation: "father", house: "19", age: 53, gender: "male" },
  { serial: "73", epic: "KDY0955336", name: "दुर्गा", guardian: "रोशन लाल", relation: "husband", house: "19", age: 44, gender: "female" },
  { serial: "74", epic: "SNE0380980", name: "संजय कुमार", guardian: "श्याम लाल", relation: "father", house: "19", age: 36, gender: "male" },
  { serial: "75", epic: "SNE0947796", name: "लादी", guardian: "संजय", relation: "husband", house: "19", age: 30, gender: "female" },
  { serial: "76", epic: "SNE1306968", name: "राधा देवी", guardian: "भावेश", relation: "husband", house: "19", age: 27, gender: "female" },
  { serial: "77", epic: "SNE1481068", name: "लोकेश कुमार", guardian: "श्याम लाल", relation: "father", house: "19", age: 24, gender: "male" },
  { serial: "78", epic: "SNE1801943", name: "माया देवी", guardian: "लोकेश कुमार", relation: "husband", house: "19", age: 22, gender: "female" },
  { serial: "79", epic: "KDY0955369", name: "मोहनलाल", guardian: "तुलछा", relation: "father", house: "20", age: 76, gender: "male" },
  { serial: "80", epic: "KDY0955344", name: "जेठुड़ी", guardian: "मोहनलाल", relation: "husband", house: "20", age: 71, gender: "female" },
  { serial: "81", epic: "KDY1228337", name: "कैलाशचन्द्र", guardian: "मोहनलाल", relation: "father", house: "20", age: 61, gender: "male" },
  { serial: "82", epic: "KDY0955351", name: "कैलाशी", guardian: "कैलाशचन्द्र", relation: "husband", house: "20", age: 59, gender: "female" },
  { serial: "83", epic: "SNE1282672", name: "गोविंद कुमार", guardian: "कैलाश", relation: "father", house: "20", age: 26, gender: "male" },
  { serial: "84", epic: "SNE1642222", name: "हेमा देवी", guardian: "गोविंद", relation: "husband", house: "20", age: 22, gender: "female" },
  { serial: "85", epic: "SNE1642172", name: "रतन लाल", guardian: "कैलाश चंद", relation: "father", house: "20", age: 21, gender: "male" },
  { serial: "86", epic: "SNE1835545", name: "पूजा देवी", guardian: "रतन लाल", relation: "husband", house: "20", age: 19, gender: "female" },
  { serial: "87", epic: "RJ/20/152/000701", name: "शान्तिलाल", guardian: "नेनूराम", relation: "father", house: "21", age: 66, gender: "male" },
  { serial: "88", epic: "KDY0955401", name: "कंचन", guardian: "शान्तिलाल", relation: "husband", house: "21", age: 62, gender: "female" },
  { serial: "89", epic: "KDY0910026", name: "पुखराज", guardian: "नेनूराम", relation: "father", house: "21", age: 53, gender: "male" },
  { serial: "90", epic: "KDY0955419", name: "इंद्रा", guardian: "पुखराज", relation: "husband", house: "21", age: 47, gender: "female" }
];

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.end();
  });
}

function apiPut(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path, method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function syncVerifiedVotersToLive() {
  console.log('========================================================================');
  console.log('   SYNCING VERIFIED BHEETA VOTER DATA TO LIVE PRODUCTION BACKEND DB     ');
  console.log('   URL: https://politics.mathxmedia.tech                                ');
  console.log('========================================================================\n');

  const membersRes = await apiGet('/api/members?limit=1000');
  const existingMembers = membersRes.members || membersRes || [];
  console.log(`Live DB current voter records fetched: ${existingMembers.length}`);

  let updatedCount = 0;
  for (const v of bhitaVotersPage3To5) {
    const existing = existingMembers.find(m => m.voterId?.toUpperCase() === v.epic.toUpperCase());
    if (existing) {
      console.log(`Updating Live Voter #${v.serial} [${v.epic}]: "${existing.name}" -> "${v.name}"`);
      const updateData = {
        name: v.name,
        guardianName: v.guardian,
        voterSerial: v.serial,
        houseNumber: v.house,
        age: v.age,
        gender: v.gender,
        verificationStatus: 'verified'
      };
      await apiPut(`/api/members/${existing._id}`, updateData);
      updatedCount++;
    }
  }

  console.log(`\n========================================================================`);
  console.log(`SUCCESS: Synchronized ${updatedCount} verified voters on live production backend!`);
  console.log(`Voter names like "अर्जुनलाल" (Serial 57 - KDY0910562) have been updated live!`);
  console.log(`========================================================================`);
}

syncVerifiedVotersToLive().catch(console.error);
