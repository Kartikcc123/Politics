const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scripts/mangled_names_list.json', 'utf8'));
console.log('Sample 60 names:');
console.log(data.names.slice(0, 60));

console.log('\nSample 60 guardians:');
console.log(data.guardians.slice(0, 60));
