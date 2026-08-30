const normalizeMergeName = (value) => String(value || '')
  .normalize('NFKD')
  .toLocaleLowerCase('hi-IN')
  // Nasal marks and nukta are frequent OCR/font variations. Keep vowel marks,
  // otherwise short names such as "Kot" and "Kota" collapse to one key.
  .replace(/[\u0901\u0902\u093c]/g, '')
  .replace(/[^ऀ-ॿ\p{L}\p{N}]+/gu, '');

const numericParts = (value) => String(value || '').match(/\p{N}+/gu) || [];

const levenshteinDistance = (left, right) => {
  const a = [...left];
  const b = [...right];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
};

const locationNameScore = (inputValue, candidateValue) => {
  const input = normalizeMergeName(inputValue);
  const candidate = normalizeMergeName(candidateValue);
  if (input.length < 2 || candidate.length < 2) return 0;
  const inputNumbers = numericParts(inputValue);
  const candidateNumbers = numericParts(candidateValue);
  if (inputNumbers.length && candidateNumbers.length
      && inputNumbers.join('|') !== candidateNumbers.join('|')) return 0;
  if (input === candidate) return 1;
  const longest = Math.max(input.length, candidate.length);
  const shortest = Math.min(input.length, candidate.length);
  if (shortest >= 4 && (input.includes(candidate) || candidate.includes(input))) {
    return shortest / longest >= 0.7 ? 0.96 : 0.9;
  }
  if (shortest < 4) return 0;
  return 1 - (levenshteinDistance(input, candidate) / longest);
};

const scoreLocationCandidate = (input, candidate) => {
  const values = [candidate.name, ...(Array.isArray(candidate.aliases) ? candidate.aliases : [])]
    .filter(Boolean);
  let score = 0;
  let matchedValue = '';
  for (const value of values) {
    const next = locationNameScore(input, value);
    if (next > score) {
      score = next;
      matchedValue = value;
    }
  }
  return { candidate, score, matchedValue };
};

const findBestLocationMatch = (input, candidates, { minScore = 0.82, ambiguityMargin = 0.06 } = {}) => {
  if (!input || !Array.isArray(candidates) || !candidates.length) return null;
  const ranked = candidates
    .map((candidate) => scoreLocationCandidate(input, candidate))
    .filter((item) => item.score >= minScore)
    .sort((left, right) => right.score - left.score);
  if (!ranked.length) return null;
  const best = ranked[0];
  const second = ranked[1];
  if (second && String(second.candidate._id || second.candidate.name) !== String(best.candidate._id || best.candidate.name)
      && best.score - second.score < ambiguityMargin) return null;
  return best;
};

const matchingLocationNames = (leftValue, rightValue) => locationNameScore(leftValue, rightValue) >= 0.82;

module.exports = {
  normalizeMergeName,
  levenshteinDistance,
  locationNameScore,
  scoreLocationCandidate,
  findBestLocationMatch,
  matchingLocationNames,
};