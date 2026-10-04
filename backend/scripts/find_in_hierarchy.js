const fs = require('fs');
const hierarchy = JSON.parse(fs.readFileSync('./backend/src/config/constituencyHierarchyAll.json', 'utf8'));

for (const samiti of hierarchy) {
  for (const gp of samiti.gramPanchayats || []) {
    for (const v of gp.villages || []) {
      if (v.name.includes('सेम') || v.name.includes('रूपा') || v.name.includes('रुपा')) {
        console.log(`Found: Village "${v.name}" | GP "${gp.name}" | Samiti "${samiti.name}" | Wards:`, v.wards);
      }
    }
  }
}
