const PREFIX_CORRECTIONS = {
  KOV: 'KDY', KOY: 'KDY', OVO: 'KDY', KDV: 'KDY',
  KOW: 'KDY', KPY: 'KDY', KTY: 'KDY', KDT: 'KDY',
  QDY: 'KDY', ODY: 'KDY', RDY: 'KDY', KOO: 'KDY',
  SSN: 'SNE', SME: 'SNE', SN3: 'SNE', SHE: 'SNE',
  '5NE': 'SNE', SNE3: 'SNE', SNEI: 'SNE', SMF: 'SNE'
};

const normalizeEpic = (value) => {
  const epic = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9/]/g, '');

  const m4 = epic.match(/^([A-Z0-9]{4})(\d{7})$/);
  if (m4 && PREFIX_CORRECTIONS[m4[1]]) {
    return `${PREFIX_CORRECTIONS[m4[1]]}${m4[2]}`;
  }

  const m = epic.match(/^([A-Z0-9]{3})([0-9O]{7})$/);
  if (m) {
    const prefix = PREFIX_CORRECTIONS[m[1]] || m[1];
    return `${prefix}${m[2].replace(/O/g, '0')}`;
  }

  return epic;
};

const isValidEpic = (value) => (
  /^[A-Z]{3}[0-9]{7}$/.test(value)
  || /^RJ\/[0-9]{1,3}\/[0-9]{1,3}\/[0-9]{5,8}$/.test(value)
);

const requireValidEpic = (value) => {
  const epic = normalizeEpic(value);
  if (!isValidEpic(epic)) {
    const error = new Error('Valid EPIC number required, e.g. ABC1234567.');
    error.status = 400;
    throw error;
  }
  return epic;
};

module.exports = { normalizeEpic, isValidEpic, requireValidEpic };

