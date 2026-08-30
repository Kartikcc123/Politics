const Party = require('../models/Party');

const defaults = [
  { name: 'Bharatiya Janata Party', code: 'BJP', color: '#f97316', website: 'https://www.bjp.org', logo: '/party-logos/bjp.svg' },
  { name: 'Indian National Congress', code: 'INC', color: '#138808', website: 'https://www.inc.in', logo: '/party-logos/congress.svg' },
  { name: 'Aam Aadmi Party', code: 'AAP', color: '#2563eb', website: 'https://aamaadmiparty.org', logo: '/party-logos/aap.svg' },
  { name: 'Other', code: 'OTHER', color: '#64748b', website: '', logo: '/party-logos/other.svg' },
];

exports.seedDefaultParties = async () => {
  for (const party of defaults) {
    await Party.findOneAndUpdate({ code: party.code }, party, { upsert: true, new: true });
  }
};

exports.findPartyFromText = async (text = '') => {
  const value = String(text || '').toLowerCase();
  const parties = await Party.find();
  return parties.find((party) => {
    const name = (party.name || '').toLowerCase();
    const code = (party.code || '').toLowerCase();
    return (code && value.includes(code)) || (name && value.includes(name)) ||
      (code === 'inc' && value.includes('congress')) ||
      (code === 'aap' && value.includes('aam aadmi')) ||
      (code === 'bjp' && value.includes('bharatiya janata'));
  });
};

