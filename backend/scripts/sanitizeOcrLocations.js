require('dotenv').config();
const connectDB = require('../src/config/db');
const Member = require('../src/models/Member');
const { cleanOcrLocation, cleanOcrVillage, cleanSectionName } = require('../src/controllers/importController');

const isNoisy = (value = '') => {
  const text = String(value || '').trim();
  return /[\[\]{}|\\~`$<>]|(?:EPIC|RJ\/|SNE\d|google|polling|station|map|view)/i.test(text)
    || text.length > 100
    || /(?:वार्ड\s*(?:संख्या|नं)|अनुभाग|भाग\s*(?:संख्या|नं)|मतदाता|क्रम\s*संख्या)/.test(text);
};

(async () => {
  await connectDB();
  const apply = process.argv.includes('--apply');
  const cursor = Member.find({ 'sourceDocument.type': 'pdf' }).cursor();
  let found = 0;
  let changed = 0;
  for await (const member of cursor) {
    const badAddress = isNoisy(member.address);
    const badVillage = isNoisy(member.village) || !cleanOcrVillage(member.village);
    const badLocation = isNoisy(member.location);
    if (!badAddress && !badVillage && !badLocation) continue;
    found += 1;
    const section = cleanSectionName(member.sectionName);
    const house = String(member.houseNumber || '').replace(/[^0-9०-९A-Za-z\/-]/g, '').slice(0, 20);
    if (badAddress) member.address = [section, house].filter(Boolean).join(', ');
    if (badVillage) member.village = '';
    if (badLocation) member.location = section || '';
    if (apply) { await member.save(); changed += 1; }
  }
  console.log(`${apply ? 'Cleaned' : 'Found'} ${apply ? changed : found} OCR location record(s).`);
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });