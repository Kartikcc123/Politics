const fs = require('fs');
const content = fs.readFileSync('c:/Users/pc/Downloads/Politics-main/Politics-main/mobile/lib/features/areas/official_samiti_wards_data.dart', 'utf8');

// Strip "const Map<String, dynamic> officialSamitiWardsData = " and ";"
const jsonStr = content
  .replace(/^const\s+Map<String,\s*dynamic>\s+officialSamitiWardsData\s*=\s*/, '')
  .replace(/;\s*$/, '');

try {
  const data = JSON.parse(jsonStr);
  console.log('Top level samitis:', Object.keys(data));
  for (const samitiName of Object.keys(data)) {
    const s = data[samitiName];
    const wards = s.wards ? Object.keys(s.wards) : [];
    console.log(`Samiti '${samitiName}': ${wards.length} wards:`, wards);
    for (const w of wards) {
      const wObj = s.wards[w];
      const gps = wObj.panchayats ? Object.keys(wObj.panchayats) : [];
      if (gps.some(g => g.includes('कोशि') || g.includes('सहा') || g.includes('शहा'))) {
        console.log(`  - Ward '${w}' has GPs:`, gps);
      }
    }
  }
} catch (e) {
  console.error('Failed to parse:', e.message);
}
