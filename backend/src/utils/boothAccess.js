exports.applyMemberScope = (user, filter = {}) => {
  if (!user || user.role === 'admin') return filter;

  // 1. Village level scope (if user assigned to specific villages)
  if (Array.isArray(user.assignedVillages) && user.assignedVillages.length > 0) {
    filter.village = { $in: user.assignedVillages };
  }
  // 2. Gram Panchayat level scope (if user assigned to whole gram panchayat)
  else if (Array.isArray(user.assignedGramPanchayats) && user.assignedGramPanchayats.length > 0) {
    filter.gramPanchayat = { $in: user.assignedGramPanchayats };
  }

  // 3. Ward level scope
  if (Array.isArray(user.assignedWards) && user.assignedWards.length > 0) {
    filter.municipalWardNumbers = { $in: user.assignedWards };
  }

  // 4. Booth / Ward head level scope
  if (user.role === 'booth' && user.assignedBooth) {
    filter.booth = user.assignedBooth?._id || user.assignedBooth;
  } else if (user.role === 'ward_head' && user.assignedWard) {
    filter.ward = user.assignedWard?._id || user.assignedWard;
  }

  return filter;
};

exports.assertBoothAccess = (user, boothId) => {
  if (!user || user.role === 'admin') return;
  if (user.role === 'booth') {
    if (!user.assignedBooth || String(boothId) !== String(user.assignedBooth._id || user.assignedBooth)) {
      const err = new Error('Booth user cannot access other booth data');
      err.status = 403;
      throw err;
    }
  }
};

exports.assertWardAccess = (user, wardId) => {
  if (!user || user.role === 'admin') return;
  if (user.role === 'ward_head') {
    if (!user.assignedWard || String(wardId) !== String(user.assignedWard._id || user.assignedWard)) {
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
