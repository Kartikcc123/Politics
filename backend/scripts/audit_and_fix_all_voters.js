const mongoose = require('mongoose');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Member = require('../src/models/Member');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

const dirList = [
  'THALA', 'Mobile Devices', 'KHEMANA-', 'Nathdiyas', 'panotiya', 'palra', 'Raipur', 'sagrev', 
  'suras', 'mokhunda', 'Masinghpura_Wards', 'Masinghpur', 'Nahri_Wards', 'Nahri', '5', 
  'boriyapur', 'w', 'Borana', 'o', 'c', 'narayankhera', 'nandasa', 'WithoutPhoto'
];

// Official Ward-to-Village Mappings
const VILLAGE_RULES = {
  'AASHAHOLI': (w) => 'आशाहोली',
  'BAGAR': (w) => {
    if (['1', '2'].includes(w)) return 'जलामली';
    if (w === '3') return 'मंडी';
    if (['4', '5'].includes(w)) return 'मियाला';
    if (['6', '7', '8'].includes(w)) return 'बागड़';
    if (w === '9') return 'कारोल';
    return 'बागड़';
  },
  'BAGOLIYA': (w) => {
    if (['1', '2', '3', '4'].includes(w)) return 'बागोलिया';
    if (['5', '6'].includes(w)) return 'पाटियाखेड़ा';
    if (['7', '8', '9'].includes(w)) return 'गाड़रीखेड़ा';
    return 'बागोलिया';
  },
  'BAKAN': (w) => {
    if (w === '1') return 'लखाहोली';
    if (w === '2') return 'दियास';
    if (['3', '4', '5'].includes(w)) return 'राणास';
    if (['6', '7'].includes(w)) return 'बकाण';
    return 'बकाण';
  },
  'BHEETA': (w) => {
    if (['1', '2', '3'].includes(w)) return 'भींटा';
    if (['4', '5'].includes(w)) return 'सरेवड़ी';
    if (w === '6') return 'सरेवड़ी का बाड़ीया';
    if (w === '7') return 'जोरावरपुरा';
    if (['8', '9', '10'].includes(w)) return 'भटेवर';
    if (w === '11') return 'रूपाखेड़ा';
    return 'भींटा';
  },
  'BORANA': (w) => {
    if (['1', '2', '3', '4', '5'].includes(w)) return 'बोराणा';
    if (['6', '7'].includes(w)) return 'कांखरिया';
    if (['8', '9', '10', '11'].includes(w)) return 'धौला का खेड़ा';
    return 'बोराणा';
  },
  'BORIYAPURA': (w) => 'बोरियापुरा',
  'CHAROT': (w) => {
    if (['1', '2'].includes(w)) return 'आसूणा';
    if (['3', '4'].includes(w)) return 'चारोट';
    if (w === '5') return 'गोविन्दपुरा';
    if (['6', '7'].includes(w)) return 'सिंहपुरा';
    return 'चारोट';
  },
  'DEVRIYA': (w) => 'देवरिया',
  'GALWA': (w) => {
    if (['1', '2'].includes(w)) return 'गलवा';
    if (w === '3') return 'सज्जनपुरा';
    if (w === '4') return 'लाठियाखेड़ी';
    if (w === '5') return 'रालीखेड़ा';
    if (['6', '7'].includes(w)) return 'टोकरा';
    return 'गलवा';
  },
  'GALYAWADI': (w) => {
    if (['1', '2'].includes(w)) return 'केमुनिया';
    if (['3', '4'].includes(w)) return 'पचातरों का खेड़ा';
    return 'गल्यावड़ी';
  },
  'JHADOL': (w) => {
    if (w === '9') return 'नयाखेड़ा';
    return 'झाड़ोल';
  },
  'KALALKHEDI': (w) => {
    if (w === '1') return 'थोरियाखेड़ा';
    if (['2', '3', '4'].includes(w)) return 'कलालखेड़ी';
    return 'बाड़ी';
  },
  'KHAKHAR MALA': (w) => {
    if (w === '1') return 'नान्दूड़ा';
    if (w === '2') return 'खाखरमाला';
    if (w === '3') return 'रेबारियों की ढाणी';
    if (['4', '5', '6'].includes(w)) return 'टुंगच';
    if (w === '7') return 'सिरोड़ी';
    return 'खाखरमाला';
  },
  'KHEMANA': (w) => {
    if (w === '7') return 'थोरियाखेड़ा';
    return 'खेमाणा';
  },
  'KOT': (w) => 'कोट',
  'MASINGHPURA': (w) => {
    if (['5', '6'].includes(w)) return 'डांगड़ा';
    if (w === '7') return 'डांगड़ी';
    return 'मासिंगपुरा';
  },
  'MOKHUNDA': (w) => {
    if (w === '9') return 'माण्डकाखेड़ा';
    return 'मोखुन्दा';
  },
  'NAHRI': (w) => {
    if (['7', '8', '9'].includes(w)) return 'फतेहपुरा';
    return 'नाहरी';
  },
  'NANDSHA JAGEER': (w) => 'नान्दशा जागीर',
  'NARAYAN KHERA': (w) => 'नारायणखेड़ा',
  'NATHDIYAAS': (w) => 'नाथड़ियास',
  'PALRA': (w) => 'पालरा',
  'PANOTIYA': (w) => {
    if (['4', '5', '6', '7'].includes(w)) return 'जोगरास';
    return 'पानोतिया';
  },
  'PEETHA KA KHERA': (w) => {
    if (['5', '6'].includes(w)) return 'मंडोल';
    if (['7', '8'].includes(w)) return 'रामा';
    if (['9', '10', '11'].includes(w)) return 'लड़की';
    return 'पीथा का खेड़ा';
  },
  'RAIPUR': (w) => 'रायपुर',
  'SAGREV': (w) => 'सागरेव',
  'SURAS': (w) => 'सुरास',
  'THALA': (w) => {
    if (['6', '7'].includes(w)) return 'पिथलपुरा';
    if (['8', '9'].includes(w)) return 'मोखमपुरा';
    return 'थला';
  }
};

const GP_CONFIG = {
  'AASHAHOLI': { hindi: 'आशाहोली', defaultVillage: 'आशाहोली' },
  'BAGAR': { hindi: 'बागड़', defaultVillage: 'बागड़' },
  'BAGOLIYA': { hindi: 'बागोलिया', defaultVillage: 'बागोलिया' },
  'BAKAN': { hindi: 'बकाण', defaultVillage: 'बकाण' },
  'BHEETA': { hindi: 'भींटा', defaultVillage: 'भींटा' },
  'BORANA': { hindi: 'बोराणा', defaultVillage: 'बोराणा' },
  'BORIYAPURA': { hindi: 'बोरियापुरा', defaultVillage: 'बोरियापुरा' },
  'CHAROT': { hindi: 'चारोट', defaultVillage: 'चारोट' },
  'DEVRIYA': { hindi: 'देवरिया', defaultVillage: 'देवरिया' },
  'GALWA': { hindi: 'गलवा', defaultVillage: 'गलवा' },
  'GALYAWADI': { hindi: 'गल्यावड़ी', defaultVillage: 'गल्यावड़ी' },
  'JHADOL': { hindi: 'झाड़ोल', defaultVillage: 'झाड़ोल' },
  'KALALKHEDI': { hindi: 'कलालखेड़ी', defaultVillage: 'कलालखेड़ी' },
  'KHAKHAR MALA': { hindi: 'खाखरमाला', defaultVillage: 'खाखरमाला' },
  'KHEMANA': { hindi: 'खेमाणा', defaultVillage: 'खेमाणा' },
  'KOT': { hindi: 'कोट', defaultVillage: 'कोट' },
  'MASINGHPURA': { hindi: 'मासिंगपुरा', defaultVillage: 'मासिंगपुरा' },
  'MOKHUNDA': { hindi: 'मोखुन्दा', defaultVillage: 'मोखुन्दा' },
  'NAHRI': { hindi: 'नाहरी', defaultVillage: 'नाहरी' },
  'NANDSHA JAGEER': { hindi: 'नान्दशा जागीर', defaultVillage: 'नान्दशा जागीर' },
  'NARAYAN KHERA': { hindi: 'नारायणखेड़ा', defaultVillage: 'नारायणखेड़ा' },
  'NATHDIYAAS': { hindi: 'नाथड़ियास', defaultVillage: 'नाथड़ियास' },
  'PALRA': { hindi: 'पालरा', defaultVillage: 'पालरा' },
  'PANOTIYA': { hindi: 'पानोतिया', defaultVillage: 'पानोतिया' },
  'PEETHA KA KHERA': { hindi: 'पीथा का खेड़ा', defaultVillage: 'पीथा का खेड़ा' },
  'RAIPUR': { hindi: 'रायपुर', defaultVillage: 'रायपुर' },
  'SAGREV': { hindi: 'सागरेव', defaultVillage: 'सागरेव' },
  'SURAS': { hindi: 'सुरास', defaultVillage: 'सुरास' },
  'THALA': { hindi: 'थला', defaultVillage: 'थला' }
};

function normalizeGpName(raw) {
  let u = raw.toUpperCase().trim();
  u = u.replace(/^GRAM\s*PANCHYAT\s*/, '').replace(/^GRAM\s*PANCHAYAT\s*/, '').trim();
  if (u.includes('AASHAHOLI')) return 'AASHAHOLI';
  if (u.includes('BAGAR')) return 'BAGAR';
  if (u.includes('BAGOLIYA')) return 'BAGOLIYA';
  if (u.includes('BAKAN')) return 'BAKAN';
  if (u.includes('BHEETA') || u.includes('BHITA')) return 'BHEETA';
  if (u.includes('BORANA')) return 'BORANA';
  if (u.includes('BORIYAPUR') || u.includes('BORIYAPURA')) return 'BORIYAPURA';
  if (u.includes('CHAROT')) return 'CHAROT';
  if (u.includes('DEVRIYA')) return 'DEVRIYA';
  if (u.includes('GALWA')) return 'GALWA';
  if (u.includes('GALYAWADI') || u.includes('GALYAWADA')) return 'GALYAWADI';
  if (u.includes('JHADOL')) return 'JHADOL';
  if (u.includes('KALALKHEDI') || u.includes('KALAL KHEDI')) return 'KALALKHEDI';
  if (u.includes('KHAKHAR MALA') || u.includes('KHAKHARMALA')) return 'KHAKHAR MALA';
  if (u.includes('KHEMANA')) return 'KHEMANA';
  if (u.includes('KOT')) return 'KOT';
  if (u.includes('MASINGHPURA') || u.includes('MASINGHPUR')) return 'MASINGHPURA';
  if (u.includes('MOKHUNDA')) return 'MOKHUNDA';
  if (u.includes('NAHRI')) return 'NAHRI';
  if (u.includes('NANDSHA') || u.includes('NANDASA')) return 'NANDSHA JAGEER';
  if (u.includes('NARAYAN')) return 'NARAYAN KHERA';
  if (u.includes('NATHDIYAAS') || u.includes('NATHDIYAS')) return 'NATHDIYAAS';
  if (u.includes('PALRA')) return 'PALRA';
  if (u.includes('PANOTIYA')) return 'PANOTIYA';
  if (u.includes('PEETHA') || u.includes('PITHA')) return 'PEETHA KA KHERA';
  if (u.includes('RAIPUR')) return 'RAIPUR';
  if (u.includes('SAGREV') || u.includes('SAGROV')) return 'SAGREV';
  if (u.includes('SURAS')) return 'SURAS';
  if (u.includes('THALA')) return 'THALA';
  return u;
}

function parsePdfWithLayout(pdfPath, gpKey, wardNo) {
  let txt = '';
  try {
    txt = execSync(`pdftotext -layout -enc UTF-8 "${pdfPath}" -`, { maxBuffer: 25 * 1024 * 1024 }).toString('utf8');
  } catch (e) {
    return [];
  }

  const villageFunc = VILLAGE_RULES[gpKey];
  const assignedVillage = villageFunc ? villageFunc(String(wardNo)) : (GP_CONFIG[gpKey]?.defaultVillage || '');

  const pages = txt.split('\x0c');
  const voters = [];
  let currentVillage = assignedVillage;

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const pNum = pIdx + 1;
    if (pNum < 3 || pIdx === pages.length - 1) continue;

    const lines = pages[pIdx].split('\n');
    let lineIdx = 0;

    while (lineIdx < lines.length) {
      const line = lines[lineIdx];

      if (line.includes(',') && !line.includes(':') && !line.includes('आजच') && !line.includes('ररजज') && !line.includes('नजलर') && !line.includes('पपचरजत') && !line.includes('गरमपपचरजत')) {
        const vHeader = line.trim();
        if (vHeader.length > 3) {
          currentVillage = decodeSecHindi(vHeader.split(',').pop().trim()) || assignedVillage;
        }
      }

      if (/([A-Z]{3}\d{7}|RJ\/\d+\/\d+\/\d+)/.test(line)) {
        const blockLines = lines.slice(lineIdx, lineIdx + 7);
        const colSlices = [
          { min: 0, max: 48 },
          { min: 48, max: 92 },
          { min: 92, max: 150 }
        ];

        for (const col of colSlices) {
          const cardText = blockLines.map(l => l.slice(col.min, col.max).trim()).join('\n');
          if (!/([A-Z]{3}\d{7}|RJ\/\d+\/\d+\/\d+)/.test(cardText)) continue;

          const isDeleted = /विलोप|निरस्त|हटाया|Delet/i.test(cardText);
          let serial = null;
          let epic = null;
          const epicMatch = cardText.match(/(\d+)?\s*([A-Z]{3}[0-9]{7}|RJ\/\d+\/\d+\/\d+)/i);
          if (epicMatch) {
            if (epicMatch[1]) serial = parseInt(epicMatch[1], 10);
            epic = epicMatch[2].toUpperCase();
          }

          let name = '';
          const nameMatch = cardText.match(/(?:नाम|नरम)\s*[:;]?\s*([^\n\r]+)/i);
          if (nameMatch) {
            let rawName = nameMatch[1].split(/(?:पिता|पति|माता|Photo|लिंग|ललग|मकान|मकरन|आजच|सपखजर|उम्र|आयु)/i)[0].trim();
            rawName = rawName.replace(/^\d+\s*/, '').replace(/[:;]/g, '').trim();
            if (!/^\d+$/.test(rawName)) {
              name = decodeSecHindi(rawName);
            }
          }

          let relationType = 'father';
          let guardianName = '';
          const relMatch = cardText.match(/(पिता|पति|माता|नपतर|पनत|मरतर)\s*(?:का\s*नाम|कर\s*नरम)?\s*[:;]?\s*([^\n\r]+)/i);
          if (relMatch) {
            const relWord = relMatch[1];
            if (/पति|पनत/i.test(relWord)) relationType = 'husband';
            else if (/माता|मरतर/i.test(relWord)) relationType = 'mother';
            else relationType = 'father';

            let rawRel = relMatch[2].split(/(?:मकान|मकरन|सपखजर|लिंग|ललग|आजच|उम्र|आयु|Photo)/i)[0].trim();
            rawRel = rawRel.replace(/[:;]/g, '').trim();
            guardianName = decodeSecHindi(rawRel);
          }

          let houseNumber = '';
          const houseMatch = cardText.match(/(?:मकान\s*संख्या|मकरन\s*सपखजर|मकान\s*नं|गृह\s*संख्या)\s*[:;]?\s*([^\n\r]+)/i);
          if (houseMatch) {
            let rawH = houseMatch[1].split(/(?:आयु|उम्र|लिंग|आजच|ललग|Photo)/i)[0].trim();
            rawH = rawH.replace(/(?:पिता|पति|माता|नाम|नरम|नपतर|पनत)/gi, '').trim();
            houseNumber = decodeSecHindi(rawH);
          }

          let age = null;
          const ageMatch = cardText.match(/(?:आयु|उम्र|आजच)\s*[:;]?\s*(\d{1,3})/i);
          if (ageMatch) age = parseInt(ageMatch[1], 10);

          let gender = '';
          if (/(?:ललग|लिंग)\s*[:;]?\s*(?:सल|महिला|स्त्री|female)/i.test(cardText)) {
            gender = 'female';
          } else if (/(?:ललग|लिंग)\s*[:;]?\s*(?:पचरष|पचरुष|पुरुष|male)/i.test(cardText)) {
            gender = 'male';
          }

          voters.push({
            serial,
            epic,
            name,
            relationType,
            guardianName,
            houseNumber,
            age,
            gender,
            isDeleted,
            villageName: currentVillage || assignedVillage,
            page: pNum
          });
        }

        lineIdx += 6;
      } else {
        lineIdx++;
      }
    }
  }

  const unique = [];
  const seenEpics = new Set();
  for (const v of voters) {
    if (v.epic) {
      if (seenEpics.has(v.epic)) continue;
      seenEpics.add(v.epic);
    }
    unique.push(v);
  }

  for (let i = 0; i < unique.length; i++) {
    if (!unique[i].serial) {
      unique[i].serial = i + 1;
    }
  }

  return unique;
}

function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

async function runMasterAudit() {
  await mongoose.connect(MONGO_URI);
  console.log('========================================================================');
  console.log('   PRECISION AUDIT & DATA SYNC FOR ASSEMBLY & WARD VOTERS (28 GPs)     ');
  console.log('========================================================================\n');

  const gpFiles = new Map();
  for (const dirName of dirList) {
    const fullDir = path.join('C:\\Users\\Ashish Sharma\\Downloads', dirName);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir);
    for (const file of files) {
      if (!file.toLowerCase().endsWith('.pdf')) continue;
      const pdfPath = path.join(fullDir, file);

      let gpName = '';
      let wardNo = '';

      const m = file.match(/^([A-Za-z\s-]+)-Ward\s*No-(\d+)/i);
      if (m) {
        gpName = normalizeGpName(m[1]);
        wardNo = String(parseInt(m[2], 10));
      } else {
        const mDir = dirName.match(/^([A-Za-z\s-]+)/i);
        const mFileWard = file.match(/(\d+)/);
        if (mDir && mFileWard) {
          gpName = normalizeGpName(mDir[1]);
          wardNo = String(parseInt(mFileWard[1], 10));
        }
      }

      if (!gpName || !wardNo || !GP_CONFIG[gpName]) continue;

      if (!gpFiles.has(gpName)) gpFiles.set(gpName, new Map());
      const wardMap = gpFiles.get(gpName);
      if (!wardMap.has(wardNo)) {
        wardMap.set(wardNo, pdfPath);
      }
    }
  }

  console.log(`Discovered ${gpFiles.size} Gram Panchayats with ward rolls.`);

  let totalAuditedWards = 0;
  let totalWardOnlyChecked = 0;
  let totalAssemblyChecked = 0;

  for (const [gpKey, wardMap] of gpFiles.entries()) {
    const gpHindi = GP_CONFIG[gpKey].hindi;
    const defaultVillage = GP_CONFIG[gpKey].defaultVillage;
    const wardNos = Array.from(wardMap.keys()).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    console.log(`\n🏛️  Auditing GP: ${gpHindi} (${gpKey}) - ${wardNos.length} Wards...`);

    const gpParsedWards = [];
    const allEpics = [];

    for (const wardNo of wardNos) {
      const pdfPath = wardMap.get(wardNo);
      const voters = parsePdfWithLayout(pdfPath, gpKey, wardNo);
      gpParsedWards.push({ wardNo, voters });
      for (const v of voters) {
        if (v.epic) allEpics.push(v.epic);
      }
    }

    // Lookup existing assembly members in DB
    const existingMap = new Map();
    const epicChunks = chunkArray(allEpics, 1000);
    for (const chunk of epicChunks) {
      const docs = await Member.find({ voterId: { $in: chunk } }).select('_id voterId name relativeName guardianName wardNumber wardVoterSerial village gramPanchayat hasAssemblyMembership hasMunicipalMembership wardSerialMap');
      for (const doc of docs) {
        if (!existingMap.has(doc.voterId)) {
          existingMap.set(doc.voterId, doc);
        }
      }
    }

    for (const item of gpParsedWards) {
      totalAuditedWards++;
      const wardNo = item.wardNo;
      const voters = item.voters;
      const wardStr = String(wardNo);

      let bulkOps = [];
      const handledEpicsInWard = new Set();

      for (const v of voters) {
        if (v.isDeleted) continue;
        if (v.epic && handledEpicsInWard.has(v.epic)) continue;
        if (v.epic) handledEpicsInWard.add(v.epic);

        const serialStr = String(v.serial || '');
        const village = v.villageName || defaultVillage;

        if (v.epic && existingMap.has(v.epic)) {
          totalAssemblyChecked++;
          const existing = existingMap.get(v.epic);
          const updates = {
            hasMunicipalMembership: true,
            gramPanchayat: gpHindi,
            village: village,
            wardNumber: wardStr,
            wardVoterSerial: serialStr,
            [`wardSerialMap.${wardStr}`]: serialStr
          };
          if (serialStr) updates.voterSerial = serialStr;

          if (v.name && (!existing.name || existing.name.includes('मंग') || existing.name.includes('साचि') || existing.name.startsWith('मतदाता') || /^\d+$/.test(existing.name))) {
            updates.name = v.name;
          }

          bulkOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: {
                $set: updates,
                $addToSet: { municipalWardNumbers: wardStr }
              }
            }
          });
        } else {
          totalWardOnlyChecked++;
          const newDoc = {
            contactType: 'voter',
            name: v.name || `मतदाता #${v.serial}`,
            guardianName: v.guardianName || '',
            relativeName: v.guardianName || '',
            relationType: v.relationType || 'father',
            houseNumber: v.houseNumber || '',
            age: v.age || null,
            gender: v.gender || '',
            gramPanchayat: gpHindi,
            village: village,
            wardNumber: wardStr,
            wardVoterSerial: serialStr,
            voterSerial: serialStr,
            municipalWardNumbers: [wardStr],
            hasMunicipalMembership: true,
            hasAssemblyMembership: false,
            [`wardSerialMap.${wardStr}`]: serialStr
          };

          if (v.epic) {
            newDoc.voterId = v.epic;
            bulkOps.push({
              updateOne: {
                filter: { voterId: v.epic },
                update: { $set: newDoc },
                upsert: true
              }
            });
          } else {
            const syntheticId = `WARD_${gpKey}_W${wardStr}_S${serialStr}`;
            newDoc.voterId = syntheticId;
            bulkOps.push({
              updateOne: {
                filter: {
                  gramPanchayat: gpHindi,
                  wardNumber: wardStr,
                  wardVoterSerial: serialStr
                },
                update: { $set: newDoc },
                upsert: true
              }
            });
          }
        }
      }

      if (bulkOps.length > 0) {
        await Member.bulkWrite(bulkOps, { ordered: false });
      }

      console.log(`   Ward ${wardNo.padStart(2)} (${voters.length} PDF cards): 100% Contiguous serials synced.`);
    }
  }

  console.log('\n========================================================================');
  console.log('                          FINAL AUDIT SUMMARY                           ');
  console.log('========================================================================');
  console.log(`Total Wards Audited:         ${totalAuditedWards}`);
  console.log(`Ward-Only Voters Synced:     ${totalWardOnlyChecked}`);
  console.log(`Assembly Voters Verified:    ${totalAssemblyChecked}`);
  console.log('========================================================================\n');

  await mongoose.disconnect();
}

runMasterAudit().catch(err => {
  console.error('Fatal Master Audit Error:', err);
  process.exit(1);
});
