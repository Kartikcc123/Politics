const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scripts/gp_ward_village_breakdown.json', 'utf8'));

console.log('=== VILLAGES WITH CORRUPTED CHARACTERS OR SEC ENCODING ===');
for (const gp of Object.keys(raw)) {
  console.log(`\n================ GP: ${gp} ================`);
  for (const ward of Object.keys(raw[gp])) {
    const list = raw[gp][ward];
    console.log(`  Ward ${ward}:`);
    for (const item of list) {
      console.log(`    - "${item.village}": ${item.count}`);
    }
  }
}
