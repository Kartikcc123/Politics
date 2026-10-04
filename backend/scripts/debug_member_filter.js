const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function testFilter() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  const cases = [
    { desc: 'Ward 1 + GP कलालखेड़ी', query: { gramPanchayat: 'कलालखेड़ी', municipalWard: '1' } },
    { desc: 'Ward 1 + GP भींटा', query: { gramPanchayat: 'भींटा', municipalWard: '1' } },
    { desc: 'Ward 1 only', query: { municipalWard: '1' } },
    { desc: 'GP कलालखेड़ी only', query: { gramPanchayat: 'कलालखेड़ी' } },
    { desc: 'GP भींटा only', query: { gramPanchayat: 'भींटा' } }
  ];

  for (const c of cases) {
    const filter = { contactType: { $ne: 'personal' } };
    const { ward, municipalWard, gramPanchayat, village } = c.query;

    const addOrClause = (conditions) => {
      if (!conditions || !conditions.length) return;
      if (filter.$or) {
        filter.$and = [...(filter.$and || []), { $or: filter.$or }, { $or: conditions }];
        delete filter.$or;
      } else if (filter.$and) {
        filter.$and.push({ $or: conditions });
      } else {
        filter.$or = conditions;
      }
    };

    if (ward || c.query.municipalWard || c.query.municipalWardNumber) {
      const rawWard = String(ward || c.query.municipalWard || c.query.municipalWardNumber || '').replace(/\D/g, '').trim();
      if (rawWard) {
        const wardRegex = new RegExp(`^(वार्ड\\s*)?0*${rawWard}$`, 'i');
        const wardConditions = [
          { wardNumber: rawWard },
          { wardNumber: wardRegex },
          { municipalWardNumbers: rawWard },
          { municipalWardNumbers: wardRegex }
        ];
        if (ward && mongoose.Types.ObjectId.isValid(ward)) {
          wardConditions.push({ ward: ward });
        }
        addOrClause(wardConditions);
      }
    }

    if (village) {
      const vRegex = new RegExp(village, 'i');
      addOrClause([
        { village: vRegex },
        { gramPanchayat: vRegex },
        { sectionName: vRegex },
        { location: vRegex }
      ]);
    }

    if (gramPanchayat) {
      const gpRegex = new RegExp(gramPanchayat, 'i');
      addOrClause([
        { gramPanchayat: gpRegex },
        { village: gpRegex },
        { sectionName: gpRegex },
        { location: gpRegex }
      ]);
    }

    const count = await Member.countDocuments(filter);
    console.log(`\nCase: [${c.desc}] -> Total: ${count}`);
  }

  await mongoose.disconnect();
}

testFilter().catch(console.error);
