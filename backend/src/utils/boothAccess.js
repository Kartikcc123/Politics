function escapeRegex(s) {
  return String(s || '').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function hindiFlexibleRegex(text) {
  if (!text) return new RegExp('');
  let t = String(text).trim();
  t = t.replace(/\u0958/g, 'क');
  t = t.replace(/\u0959/g, 'ख');
  t = t.replace(/\u095A/g, 'ग');
  t = t.replace(/\u095B/g, 'ज');
  t = t.replace(/\u095C/g, 'ड');
  t = t.replace(/\u095D/g, 'ढ');
  t = t.replace(/\u095E/g, 'फ');
  t = t.replace(/\u093C/g, '');
  let pattern = '';
  for (let i = 0; i < t.length; i++) {
    const char = t[i];
    if (char === 'ड' || char === 'ड़') {
      pattern += '(?:ड|ड़|\u0921\u093C|\u095C)';
    } else if (char === 'ढ' || char === 'ढ़') {
      pattern += '(?:ढ|ढ़|\u0922\u093C|\u095D)';
    } else if (char === 'र' || char === 'ड़') {
      pattern += '(?:र|ड|ड़|\u0921\u093C|\u095C)';
    } else if (char === 'श' || char === 'ष' || char === 'स') {
      pattern += '[शषस]';
    } else if (char === 'ब' || char === 'व') {
      pattern += '[बव]';
    } else if (char === 'ि' || char === 'ी') {
      pattern += '[िी]';
    } else if (char === 'ु' || char === 'ू') {
      pattern += '[ुू]';
    } else if (char === 'े' || char === 'ै') {
      pattern += '[ेै]';
    } else if (char === 'ो' || char === 'ौ') {
      pattern += '[ोौ]';
    } else if (char === 'ं' || char === 'ँ') {
      pattern += '[ंँ]?';
    } else {
      pattern += escapeRegex(char);
    }
  }
  return new RegExp('^' + pattern + '$', 'i');
}

exports.hindiFlexibleRegex = hindiFlexibleRegex;

exports.applyMemberScope = (user, filter = {}) => {
  if (!user || user.role === 'admin') return filter;

  // Determine allowed roll type ('municipal', 'assembly', 'all')
  const rollType = user.allowedRollType || (
    (Array.isArray(user.assignedParts) && user.assignedParts.length > 0 && (!user.assignedGramPanchayats || user.assignedGramPanchayats.length === 0))
      ? 'assembly'
      : 'municipal'
  );

  // Apply electoral roll restriction
  if (rollType === 'municipal') {
    filter.hasMunicipalMembership = true;
  } else if (rollType === 'assembly') {
    filter.hasAssemblyMembership = true;
  }

  const hasSamitiWards = Array.isArray(user.assignedSamitiWards) && user.assignedSamitiWards.length > 0;
  const hasGps = Array.isArray(user.assignedGramPanchayats) && user.assignedGramPanchayats.length > 0;
  const hasVillages = Array.isArray(user.assignedVillages) && user.assignedVillages.length > 0;

  // 1. Part / Booth number scope
  if (Array.isArray(user.assignedParts) && user.assignedParts.length > 0) {
    filter.partNumber = { $in: user.assignedParts.map(String) };
    if (hasGps) {
      filter.gramPanchayat = { $in: user.assignedGramPanchayats.map(g => hindiFlexibleRegex(g)) };
    }
    return filter;  // Part scope is the tightest – skip broader filters below
  }

  // 2. Gram Panchayat level scope
  if (hasGps) {
    const allowedGps = user.assignedGramPanchayats.map(g => hindiFlexibleRegex(g));
    if (filter.gramPanchayat) {
      filter.$and = [
        ...(filter.$and || []),
        { gramPanchayat: filter.gramPanchayat },
        { gramPanchayat: { $in: allowedGps } }
      ];
      delete filter.gramPanchayat;
    } else {
      filter.gramPanchayat = { $in: allowedGps };
    }
  }

  // 3. Village level scope (only enforce if user does not have entire GP or Samiti Ward scope)
  if (hasVillages && !hasSamitiWards && (!hasGps || user.assignedVillages.length <= 1)) {
    filter.village = { $in: user.assignedVillages.map(v => hindiFlexibleRegex(v)) };
  }

  // 3.5. Samiti Ward level scope (only apply as strict filter if GP list is empty)
  if (hasSamitiWards && !hasGps) {
    filter.panchayatSamitiWard = { $in: user.assignedSamitiWards.map(String) };
    if (user.assignedSamiti) {
      filter.panchayatSamiti = user.assignedSamiti;
    }
  }

  // 4. Ward level scope - only apply if user is explicitly a single-ward head (not multi-GP / Samiti Ward manager)
  if (!hasSamitiWards && (!hasGps || (user.assignedWards && user.assignedWards.length <= 1)) && Array.isArray(user.assignedWards) && user.assignedWards.length > 0) {
    const wards = user.assignedWards.map(String);
    const wardConditions = [
      { wardNumber: { $in: wards } },
      { municipalWardNumbers: { $in: wards } }
    ];
    if (filter.$or) {
      filter.$and = [
        ...(filter.$and || []),
        { $or: filter.$or },
        { $or: wardConditions }
      ];
      delete filter.$or;
    } else if (filter.$and) {
      filter.$and.push({ $or: wardConditions });
    } else {
      filter.$or = wardConditions;
    }
  }

  // 5. Booth / Ward head level scope
  if (user.role === 'booth' && user.assignedBooth) {
    filter.booth = user.assignedBooth?._id || user.assignedBooth;
  } else if (user.role === 'ward_head' && user.assignedWard) {
    filter.ward = user.assignedWard?._id || user.assignedWard;
  }

  return filter;
};

exports.assertBoothAccess = (user, boothId) => {
  if (!user || user.role === 'admin') return;
  if (!boothId) return;
  if (user.role === 'booth' && user.assignedBooth) {
    const assignedId = String(user.assignedBooth._id || user.assignedBooth);
    const targetId = String(boothId._id || boothId);
    if (targetId && targetId !== assignedId) {
      const err = new Error('Booth user cannot access other booth data');
      err.status = 403;
      throw err;
    }
  }
};

exports.assertWardAccess = (user, wardId) => {
  if (!user || user.role === 'admin') return;
  if (!wardId) return;
  if (user.role === 'ward_head' && user.assignedWard) {
    const assignedId = String(user.assignedWard._id || user.assignedWard);
    const targetId = String(wardId._id || wardId);
    if (targetId && targetId !== assignedId) {
      const err = new Error('Ward head cannot access other ward data');
      err.status = 403;
      throw err;
    }
  }
};

exports.assertMemberAccess = (user, member) => {
  if (!user || user.role === 'admin' || !member) return;

  const rollType = user.allowedRollType || (
    (Array.isArray(user.assignedParts) && user.assignedParts.length > 0 && (!user.assignedGramPanchayats || user.assignedGramPanchayats.length === 0))
      ? 'assembly'
      : 'municipal'
  );

  if (rollType === 'municipal' && member.hasMunicipalMembership !== true) {
    const err = new Error('इस मतदाता की सूची (विधानसभा केवल) देखने या संपादित करने की अनुमति नहीं है।');
    err.status = 403;
    throw err;
  }
  if (rollType === 'assembly' && member.hasAssemblyMembership !== true) {
    const err = new Error('इस मतदाता की सूची (वार्ड केवल) देखने या संपादित करने की अनुमति नहीं है।');
    err.status = 403;
    throw err;
  }

  // 1. Part check (also enforces GP if user has one, so same part# in other GPs is blocked)
  if (Array.isArray(user.assignedParts) && user.assignedParts.length > 0) {
    const parts = user.assignedParts.map(String);
    if (member.partNumber && !parts.includes(String(member.partNumber))) {
      const err = new Error('इस भाग/बूथ के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
      err.status = 403;
      throw err;
    }
    // Additionally enforce GP so same part# in another GP is blocked
    if (Array.isArray(user.assignedGramPanchayats) && user.assignedGramPanchayats.length > 0) {
      const matchesGp = member.gramPanchayat && user.assignedGramPanchayats.some(g => hindiFlexibleRegex(g).test(member.gramPanchayat));
      if (!matchesGp) {
        const err = new Error('इस ग्राम पंचायत के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
        err.status = 403;
        throw err;
      }
    }
  }

  const hasSamitiWards = Array.isArray(user.assignedSamitiWards) && user.assignedSamitiWards.length > 0;
  const hasGps = Array.isArray(user.assignedGramPanchayats) && user.assignedGramPanchayats.length > 0;

  // 2. Gram Panchayat check
  if (hasGps) {
    const matchesGp = member.gramPanchayat && user.assignedGramPanchayats.some(g => hindiFlexibleRegex(g).test(member.gramPanchayat));
    if (!matchesGp) {
      const err = new Error('इस ग्राम पंचायत के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
      err.status = 403;
      throw err;
    }
  }
  // 3. Village check (only if user assigned specifically to village level without whole GP/Samiti Ward)
  else if (Array.isArray(user.assignedVillages) && user.assignedVillages.length > 0 && !hasSamitiWards) {
    const matchesVil = member.village && user.assignedVillages.some(v => hindiFlexibleRegex(v).test(member.village));
    if (!matchesVil) {
      const err = new Error('इस गाँव के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
      err.status = 403;
      throw err;
    }
  }

  // 3.5. Samiti Ward check (only if GP check was not used)
  if (hasSamitiWards && !hasGps) {
    const sWards = user.assignedSamitiWards.map(String);
    if (member.panchayatSamitiWard && !sWards.includes(String(member.panchayatSamitiWard))) {
      const err = new Error('इस पंचायत समिति वार्ड के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
      err.status = 403;
      throw err;
    }
  }

  // 4. Ward check (only for single ward assignments, not full GP / Samiti Ward managers)
  if (!hasSamitiWards && (!hasGps || (user.assignedWards && user.assignedWards.length <= 1)) && Array.isArray(user.assignedWards) && user.assignedWards.length > 0) {
    const wards = user.assignedWards.map(String);
    const mWard = member.wardNumber ? String(member.wardNumber) : null;
    const mUniWards = Array.isArray(member.municipalWardNumbers) ? member.municipalWardNumbers.map(String) : [];
    const matchesWard = (mWard && wards.includes(mWard)) || mUniWards.some(w => wards.includes(w));
    if ((mWard || mUniWards.length > 0) && !matchesWard) {
      const err = new Error('इस वार्ड के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
      err.status = 403;
      throw err;
    }
  }

  // 5. Booth / Ward head level scope
  if (user.role === 'booth' && user.assignedBooth) {
    const bId = String(user.assignedBooth._id || user.assignedBooth);
    if (member.booth && String(member.booth._id || member.booth) !== bId) {
      const err = new Error('Booth user cannot access other booth data');
      err.status = 403;
      throw err;
    }
  }
  if (user.role === 'ward_head' && user.assignedWard) {
    const wId = String(user.assignedWard._id || user.assignedWard);
    if (member.ward && String(member.ward._id || member.ward) !== wId) {
      const err = new Error('Ward head cannot access other ward data');
      err.status = 403;
      throw err;
    }
  }
};

exports.requirePermission = (user, permission) => {
  if (!user) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }
  if (user.role === 'admin') return;
  if (user.permissions?.[permission] === true) return;
  
  // Default allowances for standard editing if not explicitly restricted
  if (user.permissions?.[permission] === undefined &&
      ['canCreateVoters', 'canEditVoters', 'canEditPhoto', 'canEditParty', 'canEditAnubhag', 'canMarkVoted'].includes(permission)) {
    return;
  }
  
  const err = new Error(`Permission denied: ${permission}`);
  err.status = 403;
  throw err;
};
