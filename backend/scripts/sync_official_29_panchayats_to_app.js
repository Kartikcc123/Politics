const fs = require('fs');
const officialPanchayats = require('../src/config/raipurOfficial29Panchayats.json');

// Build Dart Map for Raipur
let raipurDart = '      \'panchayats\': {\n';

for (const gp of officialPanchayats) {
  raipurDart += `        '${gp.name}': {\n`;
  raipurDart += `          'wards': ${gp.wards},\n`;
  raipurDart += `          'pop': ${gp.pop},\n`;
  raipurDart += `          'villages': [\n`;

  const vLines = gp.villages.map(v => {
    return `                {'name': '${v.name}', 'parts': '', 'pop': ${v.pop}}`;
  });

  raipurDart += vLines.join(',\n') + '\n';
  raipurDart += `              ]\n`;
  raipurDart += `        },\n`;
}
raipurDart += `      }\n`;

console.log('Generated Raipur Dart Panchayats block with 29 Panchayats!');

// Now read samiti_hierarchy_page.dart and replace Raipur block
let content = fs.readFileSync('./mobile/lib/features/areas/samiti_hierarchy_page.dart', 'utf8');

// Replace from 'panchayats': { in Raipur to closing of Raipur panchayats
const rStart = content.indexOf("'panchayats': {");
const rEnd = content.indexOf("'सहाड़ा':");

if (rStart !== -1 && rEnd !== -1) {
  // Find the closing brace of Raipur before 'सहाड़ा':
  const beforeSahara = content.lastIndexOf('},', rEnd);
  const fullRaipurBlock = content.substring(rStart, beforeSahara + 2);

  content = content.replace(fullRaipurBlock, raipurDart.trim());
  fs.writeFileSync('./mobile/lib/features/areas/samiti_hierarchy_page.dart', content, 'utf8');
  console.log('✅ Successfully updated samiti_hierarchy_page.dart with the official 29 Panchayats and 251 Wards!');
} else {
  console.error('❌ Could not locate Raipur block in samiti_hierarchy_page.dart');
}
