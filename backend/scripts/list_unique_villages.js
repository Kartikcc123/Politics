const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scripts/gp_ward_village_breakdown.json', 'utf8'));

const allVillages = new Set();
const gpVillageMap = {};

for (const [gp, wards] of Object.entries(raw)) {
  if (!gpVillageMap[gp]) gpVillageMap[gp] = new Set();
  for (const [ward, list] of Object.entries(wards)) {
    for (const item of list) {
      if (item.village) {
        allVillages.add(item.village);
        gpVillageMap[gp].add(item.village);
      }
    }
  }
}

console.log(`Total unique village strings in DB: ${allVillages.size}`);
for (const [gp, vSet] of Object.entries(gpVillageMap)) {
  console.log(`\nGP: "${gp}" (${vSet.size} villages):`, Array.from(vSet));
}
