const { parseWardPdfFull } = require('./master_import_all_29_panchayats');

const voters = parseWardPdfFull('C:\\Users\\Ashish Sharma\\Downloads\\Raipur\\RAIPUR-Ward No-008.pdf', 'रायपुर', 'रायपुर');
const v9 = voters.find(v => v.serial === 9);
console.log('Parsed voter 9:', JSON.stringify(v9, null, 2));

const v1 = voters.find(v => v.serial === 1);
console.log('Parsed voter 1:', JSON.stringify(v1, null, 2));

const v2 = voters.find(v => v.serial === 2);
console.log('Parsed voter 2:', JSON.stringify(v2, null, 2));

const v3 = voters.find(v => v.serial === 3);
console.log('Parsed voter 3:', JSON.stringify(v3, null, 2));
