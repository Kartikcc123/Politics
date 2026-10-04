const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const hindiFlexibleRegex = (value) => {
  if (!value) return undefined;
  const clean = String(value).trim().normalize('NFC');
  let pattern = '';
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (/[ँं़]/.test(char)) continue;
    if (/[डड़ड़]/.test(char)) {
      pattern += '[डड़ड़][ँं़]?';
    } else if (/[ढढ़ढ़]/.test(char)) {
      pattern += '[ढढ़ढ़][ँं़]?';
    } else if (/[नण]/.test(char)) {
      pattern += '[नण][ँं़]?';
    } else if (/[शषस]/.test(char)) {
      pattern += '[शषस][ँं़]?';
    } else if (/[बव]/.test(char)) {
      pattern += '[बव][ँं़]?';
    } else if (/[इईिी]/.test(char)) {
      pattern += '[इईिी]?[ँं़]?';
    } else if (/[उऊुू]/.test(char)) {
      pattern += '[उऊुू]?[ँं़]?';
    } else if (/[एऐेै]/.test(char)) {
      pattern += '[एऐेै]?[ँं़]?';
    } else if (/[दधथ]/.test(char)) {
      pattern += '[दधथ][ँं़]?';
    } else if (char === ' ') {
      pattern += '\\s*';
    } else {
      pattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ँं़]?';
    }
  }
  return new RegExp(pattern, 'i');
};

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const testList = [
    'धोरिया खेड़ा', 'लड़की', 'मासिंगपुरा', 'मांडका खेड़ा', 'डूंगरी',
    'झाड़ोल', 'सिंहपुरा', 'मेरिया खेड़ा', 'पीथा का खेड़ा', 'मांडोल',
    'धूल खेड़ा', 'कलालखेड़ी', 'पाबियों का खेड़ा', 'नारायणखेड़ा',
    'देवाड़ा', 'उड़सीपुरा', 'जोरावरपुरा', 'सेमलाट'
  ];

  console.log('--- Testing Enhanced Hindi Regex against DB ---');
  for (const name of testList) {
    const reg = hindiFlexibleRegex(name);
    const count = await Member.countDocuments({
      $or: [
        { village: reg },
        { gramPanchayat: reg },
        { sectionName: reg },
        { location: reg }
      ]
    });
    console.log(`🔍 "${name}" -> count: ${count}`);
  }

  process.exit(0);
}

run().catch(console.error);
