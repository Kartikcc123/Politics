const SEARCH_VERSION = 8;
const SEARCH_SOURCE_FIELDS = [
  'name',
  'surname',
  'mobile',
  'altMobile',
  'voterId',
  'voterSerial',
  'guardianName',
  'houseNumber',
  'address',
  'location',
  'village',
  'gramPanchayat',
  'tehsil',
  'municipality',
  'caste',
  'subCaste',
  'organizationPost',
  'organizationLevel',
  'occupation',
  'education',
  'sectionNumber',
  'sectionName',
  'partName',
  'postOffice',
  'policeStation',
  'district',
  'pinCode',
  'assemblyNumber',
  'assemblyName',
  'partNumber',
  'extraDetails',
];

const hindiDigits = '\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f';
const asciiDigits = '0123456789';

const normalizeDigits = (value) => String(value || '').replace(
  /[\u0966-\u096f]/g,
  (digit) => asciiDigits[hindiDigits.indexOf(digit)],
);

const normalizeSearchValue = (value) => normalizeDigits(value)
  .normalize('NFKC')
  .toLocaleLowerCase('hi-IN')
  .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '')
  .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compactIdentifier = (value) => normalizeSearchValue(value).replace(/\s+/g, '');
const compactDigits = (value) => normalizeDigits(value).replace(/\D/g, '');
const looseHindiToken = (value) => String(value || '')
  .replace(/[\u093a-\u094c\u094e-\u0957\u0962\u0963]/g, '')
  .replace(/\s+/g, '');

const canonicalEpic = (value) => {
  const compact = compactIdentifier(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!compact) return '';
  if (!/^[A-Z]{3}/.test(compact)) return compact;
  const map = { O: '0', I: '1', L: '1', S: '5', B: '8', Z: '2', G: '6' };
  return compact.slice(0, 3) + compact.slice(3).replace(/[OILSBZG]/g, (char) => map[char]);
};

const sourceValues = (member) => {
  const values = SEARCH_SOURCE_FIELDS
    .filter((field) => field !== 'extraDetails')
    .map((field) => member?.[field]);
  for (const detail of member?.extraDetails || []) {
    values.push(detail?.label, detail?.value);
  }
  return values.filter((value) => value !== undefined && value !== null && String(value).trim());
};

const addPrefixes = (keys, token) => {
  if (!token) return;
  for (let length = 1; length <= Math.min(token.length, 30); length += 1) {
    keys.add(token.slice(0, length));
  }
  keys.add(token);
};

const addLoosePrefixes = (keys, token) => {
  const loose = looseHindiToken(token);
  if (!loose || loose === token || !/[\u0900-\u097f]/.test(token)) return;
  for (let length = 1; length <= Math.min(loose.length, 30); length += 1) {
    keys.add('~' + loose.slice(0, length));
  }
};

const addPersonSubstrings = (keys, value) => {
  for (const token of normalizeSearchValue(value).split(' ')) {
    if (token.length < 3) continue;
    for (let start = 1; start < token.length - 1; start += 1) {
      keys.add(token.slice(start));
    }
  }
};

const devanagariConsonants = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l', 'ड़': 'd', 'ढ़': 'dh',
};

const phoneticSkeleton = (value) => {
  const text = normalizeSearchValue(value);
  if (!text) return '';
  if (/[\u0900-\u097f]/.test(text)) {
    return [...text].map((char) => devanagariConsonants[char] || '').join('');
  }
  return text.replace(/[^a-z]/g, '').replace(/[aeiou]/g, '');
};

const deletionKeys = (
  value,
  { digitsOnly = false, phoneticPrefixes = false, includePhonetic = true } = {},
) => {
  const normalized = digitsOnly
    ? compactDigits(value)
    : normalizeSearchValue(value);
  if (!normalized) return [];
  const variants = new Set();
  if (digitsOnly) variants.add(normalized);
  else {
    variants.add(normalized.replace(/\s+/g, ''));
    normalized.split(' ').forEach((token) => variants.add(token));
    const loose = looseHindiToken(normalized);
    if (/[\u0900-\u097f]/.test(normalized) && loose && loose !== normalized) {
      variants.add('~' + loose);
    }
    const phonetic = includePhonetic ? phoneticSkeleton(normalized) : '';
    if (phonetic.length >= 3) variants.add('#' + phonetic);
  }
  const keys = new Set();
  for (const variant of variants) {
    const phonetic = variant.startsWith('#');
    const prefixLength = phonetic || variant.startsWith('~') ? 1 : 0;
    const searchableLength = variant.length - prefixLength;
    if (searchableLength < 3) continue;
    keys.add(variant);
    if (phonetic) {
      // Safe cross-script prefix search: arjun matches arjunlal without
      // deleting consonants and colliding with unrelated names like ratanlal.
      const phoneticVariants = new Set([variant.slice(1)]);
      const skeleton = variant.slice(1);
      if (skeleton.length >= 5) {
        for (let index = 0; index < skeleton.length - 1; index += 1) {
          if (skeleton[index] === skeleton[index + 1]) continue;
          phoneticVariants.add(
            skeleton.slice(0, index)
            + skeleton[index + 1]
            + skeleton[index]
            + skeleton.slice(index + 2),
          );
        }
      }
      for (const phoneticVariant of phoneticVariants) {
        const firstLength = phoneticPrefixes ? 3 : phoneticVariant.length;
        for (let length = firstLength; length <= phoneticVariant.length; length += 1) {
          keys.add('#' + phoneticVariant.slice(0, length));
        }
      }
      continue;
    }
    const minimumFuzzyLength = 4;
    if (searchableLength < minimumFuzzyLength || searchableLength > 40) continue;
    for (let index = prefixLength; index < variant.length; index += 1) {
      keys.add(variant.slice(0, index) + variant.slice(index + 1));
    }
  }
  return [...keys];
};

const fieldSearchData = (member) => ({
  searchNameKeys: [...new Set([
    ...deletionKeys([member?.name, member?.surname].filter(Boolean).join(' '), { phoneticPrefixes: true }),
    ...deletionKeys(member?.name, { phoneticPrefixes: true }),
    ...deletionKeys(member?.surname, { phoneticPrefixes: true }),
  ])],
  searchGuardianKeys: deletionKeys(member?.guardianName, { phoneticPrefixes: true }),
  searchEpicKeys: deletionKeys(canonicalEpic(member?.voterId), { includePhonetic: false }),
  searchHouseKeys: [...new Set([
    normalizeSearchValue(member?.houseNumber),
    ...deletionKeys(member?.houseNumber),
  ].filter(Boolean))],
  searchMobileKeys: [...new Set([
    ...deletionKeys(member?.mobile, { digitsOnly: true }),
    ...deletionKeys(member?.altMobile, { digitsOnly: true }),
  ])],
  searchVillageKeys: deletionKeys(member?.village),
  searchPinKeys: deletionKeys(member?.pinCode, { digitsOnly: true, includePhonetic: false }),
});

const buildMemberSearchData = (member) => {
  const values = sourceValues(member);
  const normalizedValues = values.map(normalizeSearchValue).filter(Boolean);
  const keys = new Set();
  for (const value of normalizedValues) {
    value.split(' ').forEach((token) => {
      addPrefixes(keys, token);
      addLoosePrefixes(keys, token);
    });
  }
  [member?.name, member?.surname, member?.guardianName].forEach((value) => {
    addPersonSubstrings(keys, value);
    deletionKeys(value).forEach((key) => keys.add(key));
  });
  deletionKeys([member?.name, member?.surname].filter(Boolean).join(' '))
    .forEach((key) => keys.add(key));

  for (const field of ['mobile', 'altMobile']) {
    const digits = compactDigits(member?.[field]);
    if (!digits) continue;
    addPrefixes(keys, digits);
    for (let length = 4; length <= digits.length; length += 1) {
      keys.add(digits.slice(-length));
    }
  }

  const epic = canonicalEpic(member?.voterId);
  if (epic) addPrefixes(keys, epic.toLowerCase());

  const exact = new Set(normalizedValues);
  for (const field of ['mobile', 'altMobile']) {
    const digits = compactDigits(member?.[field]);
    if (digits) exact.add(digits);
  }
  if (epic) exact.add(epic.toLowerCase());

  return {
    searchVersion: SEARCH_VERSION,
    searchText: normalizedValues.join(' '),
    searchKeys: [...keys].slice(0, 600),
    searchExact: [...exact].slice(0, 200),
    ...fieldSearchData(member),
  };
};

const searchTokens = (query) => {
  const normalized = normalizeSearchValue(query);
  if (!normalized) return [];
  return normalized.split(' ').map((token) => {
    const digits = compactDigits(token);
    if (digits && digits.length === token.length) return digits;
    const epic = canonicalEpic(token);
    if (/^(?=[a-z0-9]*[0-9])[a-z]{3}[a-z0-9]{3,}$/i.test(token) && epic) return epic.toLowerCase();
    return token;
  });
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SEARCH_FALLBACK_FIELDS = [
  'name',
  'surname',
  'guardianName',
  'mobile',
  'altMobile',
  'voterId',
  'voterSerial',
  'houseNumber',
  'address',
  'location',
  'village',
  'gramPanchayat',
  'postOffice',
  'policeStation',
  'district',
  'pinCode',
  'sectionName',
  'partName',
  'assemblyName',
  'partNumber',
];

const fallbackRegexConditions = (token) => {
  const escaped = escapeRegex(token);
  const conditions = SEARCH_FALLBACK_FIELDS.map((field) => ({ [field]: new RegExp(escaped, 'i') }));
  const digits = compactDigits(token);
  if (digits) {
    conditions.push(
      { mobile: new RegExp(escapeRegex(digits), 'i') },
      { altMobile: new RegExp(escapeRegex(digits), 'i') },
      { houseNumber: new RegExp(escapeRegex(digits), 'i') },
      { voterSerial: new RegExp(escapeRegex(digits), 'i') },
    );
  }
  const epic = canonicalEpic(token);
  if (epic) conditions.push({ voterId: new RegExp(escapeRegex(epic), 'i') });
  return conditions;
};

const FIELD_SEARCH_FIELDS = {
  name: ['name', 'surname'],
  guardian: ['guardianName'],
  epic: ['voterId'],
  house: ['houseNumber'],
  mobile: ['mobile', 'altMobile'],
  village: ['village'],
  pin: ['pinCode'],
};

const FIELD_SEARCH_KEY_FIELDS = {
  name: 'searchNameKeys',
  guardian: 'searchGuardianKeys',
  epic: 'searchEpicKeys',
  house: 'searchHouseKeys',
  mobile: 'searchMobileKeys',
  village: 'searchVillageKeys',
  pin: 'searchPinKeys',
};

const fieldRegexConditions = (mode, token) => {
  const fields = FIELD_SEARCH_FIELDS[mode];
  if (!fields) return null;
  if (mode === 'pin') {
    const pin = compactDigits(token);
    return pin ? [{ pinCode: new RegExp('^' + escapeRegex(pin) + '$', 'i') }] : [];
  }
  if (mode === 'house') {
    const house = normalizeSearchValue(token);
    return house ? [{ houseNumber: new RegExp('^' + escapeRegex(house) + '$', 'i') }] : [];
  }
  if (mode === 'epic') {
    const epic = canonicalEpic(token);
    return epic ? [{ voterId: new RegExp('^' + escapeRegex(epic) + '$', 'i') }] : [];
  }
  const escaped = escapeRegex(token);
  const conditions = fields.map((field) => ({ [field]: new RegExp(escaped, 'i') }));
  if (mode === 'mobile') {
    const digits = compactDigits(token);
    if (digits) conditions.push(
      { mobile: new RegExp(escapeRegex(digits), 'i') },
      { altMobile: new RegExp(escapeRegex(digits), 'i') },
    );
  }
  return conditions;
};

const buildStrictFieldSearchConditions = (query, mode) => {
  const cleanMode = String(mode || '').trim();
  if (!FIELD_SEARCH_FIELDS[cleanMode]) return buildSearchConditions(query);
  const tokens = ['epic', 'house', 'mobile', 'pin'].includes(cleanMode)
    ? [String(query || '').trim()].filter(Boolean)
    : searchTokens(query);
  return tokens.map((token) => {
    const digitsOnly = cleanMode === 'mobile' || cleanMode === 'pin';
    const value = cleanMode === 'epic' ? canonicalEpic(token) : token;
    const normalized = digitsOnly ? compactDigits(value) : normalizeSearchValue(value);
    const compact = digitsOnly ? normalized : compactIdentifier(value).toLowerCase();
    const phoneticLength = cleanMode === 'name' || cleanMode === 'guardian'
      ? phoneticSkeleton(value).length
      : 0;
    const loose = /[ऀ-ॿ]/.test(String(value || '')) ? looseHindiToken(value) : '';
    const strictKeys = [...new Set([normalized, compact, ...deletionKeys(value, {
      digitsOnly,
      includePhonetic: cleanMode !== 'epic',
    })].filter(Boolean))].filter((key) => (
      key === normalized
      || key === compact
      || (loose && key === '~' + loose)
      || (key.startsWith('#') && key.length === phoneticLength + 1)
    ));
    return {
      $or: [
        ...(strictKeys.length
          ? [{ [FIELD_SEARCH_KEY_FIELDS[cleanMode]]: { $in: strictKeys } }]
          : []),
        ...(fieldRegexConditions(cleanMode, token) || []),
      ],
    };
  });
};

const buildFieldSearchConditions = (query, mode) => {
  const cleanMode = String(mode || '').trim();
  if (!FIELD_SEARCH_FIELDS[cleanMode]) return buildSearchConditions(query);
  const tokens = ['epic', 'house', 'mobile', 'pin'].includes(cleanMode)
    ? [String(query || '').trim()].filter(Boolean)
    : searchTokens(query);
  return tokens.map((token) => {
    const digitsOnly = cleanMode === 'mobile' || cleanMode === 'pin';
    const fuzzyKeys = deletionKeys(
      cleanMode === 'epic' ? canonicalEpic(token) : token,
      { digitsOnly, includePhonetic: cleanMode !== 'epic' },
    );
    return {
      $or: [
        ...(fuzzyKeys.length
          ? [{ [FIELD_SEARCH_KEY_FIELDS[cleanMode]]: { $in: fuzzyKeys } }]
          : []),
        ...(fieldRegexConditions(cleanMode, token) || []),
      ],
    };
  });
};
const buildSearchConditions = (query) => searchTokens(query)
  .map((token) => {
    const loose = looseHindiToken(token);
    const fuzzyKeys = deletionKeys(token);
    const searchKeyConditions = [
      ...(fuzzyKeys.length ? [{ searchKeys: { $in: fuzzyKeys } }] : []),
      ...(loose && loose !== token && /[\u0900-\u097f]/.test(token)
        ? [{ searchKeys: token }, { searchKeys: '~' + loose }]
        : [{ searchKeys: token }]),
    ];
    return { $or: [...searchKeyConditions, ...fallbackRegexConditions(token)] };
  });
const searchExactCandidates = (query) => {
  const values = new Set();
  const normalized = normalizeSearchValue(query);
  const compact = compactIdentifier(query);
  const digits = compactDigits(query);
  const epic = canonicalEpic(query);
  if (normalized) values.add(normalized);
  if (compact) values.add(compact);
  if (digits) values.add(digits);
  if (epic) values.add(epic.toLowerCase());
  return [...values];
};

const ensureMemberSearchData = async (Member) => {
  const cursor = Member.find({ searchVersion: { $ne: SEARCH_VERSION } })
    .select(SEARCH_SOURCE_FIELDS.join(' '))
    .lean()
    .cursor();
  let operations = [];
  let updated = 0;
  const flush = async () => {
    if (!operations.length) return;
    await Member.bulkWrite(operations, { ordered: false });
    updated += operations.length;
    operations = [];
  };
  for await (const member of cursor) {
    operations.push({
      updateOne: {
        filter: { _id: member._id },
        update: { $set: buildMemberSearchData(member) },
        timestamps: false,
      },
    });
    if (operations.length >= 250) await flush();
  }
  await flush();
  return updated;
};

module.exports = {
  SEARCH_VERSION,
  SEARCH_SOURCE_FIELDS,
  normalizeSearchValue,
  canonicalEpic,
  buildMemberSearchData,
  buildSearchConditions,
  buildFieldSearchConditions,
  buildStrictFieldSearchConditions,
  searchExactCandidates,
  ensureMemberSearchData,
};
