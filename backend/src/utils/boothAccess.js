exports.applyMemberScope = (user, filter = {}) => {
  if (!user || user.role === 'admin') return filter;

  // 1. Part / Booth number scope
  if (Array.isArray(user.assignedParts) && user.assignedParts.length > 0) {
    filter.partNumber = { $in: user.assignedParts.map(String) };
  }

  // 2. Village level scope (if user assigned to specific villages)
  if (Array.isArray(user.assignedVillages) && user.assignedVillages.length > 0) {
    filter.village = { $in: user.assignedVillages };
  }
  // 3. Gram Panchayat level scope (if user assigned to whole gram panchayat)
  else if (Array.isArray(user.assignedGramPanchayats) && user.assignedGramPanchayats.length > 0) {
    filter.gramPanchayat = { $in: user.assignedGramPanchayats };
  }

  // 4. Ward level scope
  if (Array.isArray(user.assignedWards) && user.assignedWards.length > 0) {
    const wards = user.assignedWards.map(String);
    if (filter.$or) {
      filter.$and = [
        ...(filter.$and || []),
        { $or: filter.$or },
        { $or: [{ wardNumber: { $in: wards } }, { municipalWardNumbers: { $in: wards } }] }
      ];
      delete filter.$or;
    } else {
      filter.$or = [
        { wardNumber: { $in: wards } },
        { municipalWardNumbers: { $in: wards } }
      ];
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

  // 1. Part check
  if (Array.isArray(user.assignedParts) && user.assignedParts.length > 0) {
    const parts = user.assignedParts.map(String);
    if (member.partNumber && !parts.includes(String(member.partNumber))) {
      const err = new Error('इस भाग/बूथ के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
      err.status = 403;
      throw err;
    }
  }

  // 2. Village check
  if (Array.isArray(user.assignedVillages) && user.assignedVillages.length > 0) {
    if (member.village && !user.assignedVillages.includes(member.village)) {
      const err = new Error('इस गाँव के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
      err.status = 403;
      throw err;
    }
  }
  // 3. Gram Panchayat check
  else if (Array.isArray(user.assignedGramPanchayats) && user.assignedGramPanchayats.length > 0) {
    if (member.gramPanchayat && !user.assignedGramPanchayats.includes(member.gramPanchayat)) {
      const err = new Error('इस ग्राम पंचायत के मतदाता को देखने या संपादित करने की अनुमति नहीं है।');
      err.status = 403;
      throw err;
    }
  }

  // 4. Ward check
  if (Array.isArray(user.assignedWards) && user.assignedWards.length > 0) {
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
