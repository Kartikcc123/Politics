const normalizeEpic = (value) => String(value || '')
  .toUpperCase()
  .replace(/[^A-Z0-9/]/g, '')
  .replace(/^([A-Z]{3})([0-9O]{7})$/, (_, prefix, digits) => `${prefix}${digits.replace(/O/g, '0')}`);

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
