const mongoose = require('mongoose');

const hindiFlexibleRegex = (value) => {
  if (!value) return undefined;
  const clean = String(value).trim().normalize('NFC');
  const tokens = [];
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (/[ँं़]/.test(char)) continue;
    if (/[डड़ड़]/.test(char)) {
      tokens.push('[डड़ड़][ँं़]?');
    } else if (/[ढढ़ढ़]/.test(char)) {
      tokens.push('[ढढ़ढ़][ँं़]?');
    } else if (/[नण]/.test(char)) {
      tokens.push('[नण][ँं़]?');
    } else if (/[शषस]/.test(char)) {
      tokens.push('[शषस][ँं़]?');
    } else if (/[बव]/.test(char)) {
      tokens.push('[बव][ँं़]?');
    } else if (/[इईिी]/.test(char)) {
      tokens.push('[इईिी]?[ँं़]?');
    } else if (/[उऊुू]/.test(char)) {
      tokens.push('[उऊुू]?[ँं़]?');
    } else if (/[एऐेै]/.test(char)) {
      tokens.push('[एऐेै]?[ँं़]?');
    } else if (/[दधथ]/.test(char)) {
      tokens.push('[दधथ][ँं़]?');
    } else if (char === ' ') {
      // space handled between tokens
    } else {
      tokens.push(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ँं़]?');
    }
  }
  return new RegExp(tokens.join('\\s*'), 'i');
};

async function test() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');

  const r1 = hindiFlexibleRegex('पीथाकाखेड़ा');
  const r2 = hindiFlexibleRegex('पीथा का खेड़ा');

  console.log('Regex for "पीथाकाखेड़ा":', r1);
  console.log('Regex for "पीथा का खेड़ा":', r2);

  const c1 = await Member.countDocuments({
    $or: [
      { village: r1 },
      { gramPanchayat: r1 },
      { sectionName: r1 },
      { location: r1 }
    ]
  });

  const c2 = await Member.countDocuments({
    $or: [
      { village: r2 },
      { gramPanchayat: r2 },
      { sectionName: r2 },
      { location: r2 }
    ]
  });

  console.log('Results when searching "पीथाकाखेड़ा":', c1);
  console.log('Results when searching "पीथा का खेड़ा":', c2);

  process.exit(0);
}

test().catch(console.error);
