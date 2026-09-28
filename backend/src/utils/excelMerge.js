const normalizeHeader = (value) => String(value ?? '')
  .normalize('NFKC')
  .trim()
  .toLocaleLowerCase('en-IN')
  .replace(/[._/\\()-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const headerAliases = {
  name: ['namehindi', 'name hindi', 'नाम', 'मतदाता नाम', 'मतदाता का नाम', 'name', 'full name', 'voter name', 'elector name', 'naam'],
  surname: ['surname', 'last name', 'उपनाम'],
  guardianName: [
    'partentnamehin', 'partentnamehindi', 'parentnamehin', 'parentnamehindi', 'parent name hindi',
    'पिता', 'पिता का नाम', 'पति का नाम', 'पिता पति का नाम', 'अभिभावक का नाम',
    'guardian name', 'father name', "father's name", 'father husband name', 'father or husband name',
    'pita name', 'pita', 'father', 'parentname', 'partentname', 'parent name'
  ],
  relationType: ['relatio', 'relation type', 'rln type', 'relationship', 'संबंध', 'सम्बन्ध', 'relation', 'rel'],
  mobile: [
    'mobileno', 'mobile', 'mobile no', 'mobile number', 'mobilef', 'mobile f', 'mob', 'mob no', 'mob.no', 'mobile_no', 'phone',
    'phone no', 'phone number', 'मोबाइल', 'मोबाइल नंबर', 'फोन', 'फोन नंबर', 'contact', 'contact no', 'contact number'
  ],
  altMobile: ['alternate mobile', 'alternative mobile', 'alt mobile', 'alternate phone', 'दूसरा मोबाइल', 'वैकल्पिक मोबाइल'],
  voterId: [
    'epicno', 'epic no', 'voter id', 'epic', 'epic number', 'epic_no', 'voterid', 'voter_id',
    'मतदाता id', 'मतदाता आईडी', 'मतदाता पहचान पत्र', 'पहचान पत्र संख्या', 'epicno.'
  ],
  voterSerial: [
    'sn', 'sno', 'serial', 'serial no', 'serial number', 'sl no in part', 'क्रमांक', 'मतदाता क्रमांक', 'क्र', 'क्र.', 'क्रं', 'क्रं.',
    'क', 'क.', 'मतदाता क्र.', 'मतदाता क्रं.', 'सरियल', 'सीरियल', 's no', 'sno.', 'sn.', 'sn ..', 'sr no', 'srno'
  ],
  houseNumber: ['makan no', 'makan no.', 'house number', 'house no', 'house', 'मकान संख्या', 'घर संख्या', 'गृह संख्या', 'makan', 'makan_no', 'house_no'],
  address: ['address', 'full address', 'पता', 'पूरा पता'],
  gender: ['gend', 'gender', 'sex', 'लिंग'],
  age: ['ag', 'age', 'उम्र', 'आयु'],
  occupation: ['occupation', 'profession', 'work', 'व्यवसाय', 'पेशा'],
  education: ['education', 'qualification', 'शिक्षा', 'योग्यता'],
  caste: ['caste', 'cast', 'जाति', 'जात'],
  subCaste: ['sub caste', 'subcaste', 'उपजाति'],
  organizationPost: ['organization post', 'post', 'position', 'पद'],
  organizationLevel: ['organization level', 'post level', 'पद स्तर'],
  supportLevel: ['support level', 'support', 'समर्थन स्तर', 'समर्थन', 'samarthak', 'समर्थक'],
  assemblyNumber: ['assembly number', 'assembly no', 'ac no', 'विधानसभा संख्या'],
  assemblyName: ['assembly name', 'assembly', 'vidhansabha', 'विधानसभा', 'विधानसभा नाम'],
  partNumber: ['partn', 'part number', 'part no', 'भाग संख्या', 'भाग नं', 'partno', 'part_no'],
  sectionNumber: ['section number', 'section no', 'अनुभाग संख्या', 'अनुभाग नं', 'sectionno', 'section_no'],
  sectionName: ['section name', 'section', 'अनुभाग नाम', 'मोहल्ला', 'मोहल्ला नाम', 'sectionn', 'mohalla'],
  village: ['villeg', 'village', 'villege', 'gram', 'गांव', 'गाँव', 'ग्राम', 'gaon'],
  gramPanchayat: ['gram panchayat', 'panchayat', 'ग्राम पंचायत', 'पंचायत'],
  tehsil: ['tehsil', 'block', 'तहसील', 'ब्लॉक'],
  pinCode: ['pin code', 'pincode', 'pin', 'postal code', 'पिन कोड', 'पिन'],
  municipality: ['municipality', 'nagar palika', 'नगरपालिका', 'नगर पालिका'],
};

const aliasToField = new Map();
for (const [field, aliases] of Object.entries(headerAliases)) {
  aliasToField.set(normalizeHeader(field), field);
  for (const alias of aliases) aliasToField.set(normalizeHeader(alias), field);
}

const isKnownExcelHeader = (header) => aliasToField.has(normalizeHeader(header));

const canonicalizeExcelRow = (row = {}) => {
  const result = {};
  for (const [header, value] of Object.entries(row)) {
    const field = aliasToField.get(normalizeHeader(header));
    if (!field) {
      result[header] = value;
      continue;
    }
    const valStr = String(value || '').trim();
    const existingVal = String(result[field] || '').trim();

    // If existing value is empty, set it
    if (!existingVal) {
      result[field] = value;
    } else if (/[\u0900-\u097F]/.test(valStr) && !/[\u0900-\u097F]/.test(existingVal)) {
      // HINDI TEXT ALWAYS OVERRIDES ENGLISH TEXT!
      result[field] = value;
    } else if (normalizeHeader(header).includes('hin') || normalizeHeader(header).includes('हिंदी') || normalizeHeader(header).includes('hindi')) {
      if (valStr) result[field] = value;
    }
  }
  return result;
};

const isBlank = (value) => value === undefined
  || value === null
  || (Array.isArray(value) ? value.length === 0 : String(value).trim() === '');

const ignoredMergeFields = new Set([
  '_id', 'voterId', 'photo', 'qrCode', 'createdAt', 'updatedAt', 'createdBy',
  'updatedBy', 'sourceDocument', 'area', 'booth', 'ward', 'extraDetails',
  'ocrValues', 'ocrFieldConfidence', 'locationResolution', 'verificationStatus',
]);
const ocrFields = new Set([
  'name', 'guardianName', 'houseNumber', 'age', 'gender', 'voterSerial',
  'assemblyNumber', 'assemblyName', 'partNumber', 'sectionNumber', 'sectionName',
  'tehsil', 'gramPanchayat', 'village', 'pinCode', 'address', 'location',
]);
const locationFields = new Set([
  'assemblyNumber', 'assemblyName', 'partNumber', 'sectionNumber', 'sectionName',
  'tehsil', 'gramPanchayat', 'village', 'pinCode', 'address', 'location',
]);

const valuesEqual = (left, right) => String(left ?? '').normalize('NFKC').trim().toLocaleLowerCase('hi-IN')
  === String(right ?? '').normalize('NFKC').trim().toLocaleLowerCase('hi-IN');

const canCorrectOcrField = (existing, field, threshold) => {
  const verified = existing.ocrValues?.verified || {};
  if (!isBlank(verified[field])) return false;
  if (existing.ocrValues?.status === 'verified' || existing.ocrValues?.status === 'manual') return false;
  if (locationFields.has(field)
      && ['verified', 'manual'].includes(existing.locationResolution?.status)) return false;
  const confidence = Number(existing.ocrFieldConfidence?.[field]);
  if (Number.isFinite(confidence) && confidence < threshold) return true;
  const reasons = (existing.ocrReviewReasons || []).join(' ').toLocaleLowerCase('en-IN');
  if (reasons.includes(field.toLocaleLowerCase('en-IN'))) return true;
  return existing.verificationStatus === 'needs_review'
    && ocrFields.has(field)
    && (!Number.isFinite(confidence) || confidence < threshold);
};

const buildSafeExcelMerge = (existing, incoming, { confidenceThreshold = 75, casteOnlyMode = false } = {}) => {
  const updates = {};
  const filled = [];
  const corrected = [];
  const conflicts = [];
  const isCastePresent = !isBlank(incoming?.caste);

  for (const [field, incomingValue] of Object.entries(incoming || {})) {
    if (ignoredMergeFields.has(field) || isBlank(incomingValue)) continue;
    
    // If incoming has caste, prioritize updating caste safely while preserving other existing core fields
    if (isCastePresent && field !== 'caste' && field !== 'subCaste') {
      const currentValue = existing?.[field];
      if (isBlank(currentValue)) {
        updates[field] = incomingValue;
        filled.push(field);
      }
      continue;
    }

    const currentValue = existing?.[field];
    if (isBlank(currentValue)) {
      updates[field] = incomingValue;
      filled.push(field);
      continue;
    }
    if (valuesEqual(currentValue, incomingValue)) continue;
    if (field === 'caste' || field === 'subCaste') {
      updates[field] = incomingValue;
      filled.push(field);
      continue;
    }
    if (ocrFields.has(field) && canCorrectOcrField(existing, field, confidenceThreshold)) {
      updates[field] = incomingValue;
      corrected.push(field);
      continue;
    }
    conflicts.push({ field, existing: currentValue, incoming: incomingValue });
  }
  return { updates, filled, corrected, conflicts };
};

module.exports = {
  normalizeHeader,
  canonicalizeExcelRow,
  isKnownExcelHeader,
  buildSafeExcelMerge,
};