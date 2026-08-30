exports.applyMemberScope = (user, filter = {}) => {
  if (user.role === 'booth') {
    filter.booth = user.assignedBooth?._id || user.assignedBooth;
  } else if (user.role === 'ward_head') {
    filter.ward = user.assignedWard?._id || user.assignedWard;
  }
  return filter;
};

exports.assertBoothAccess = (user, boothId) => {
  if (user.role !== 'booth') return;
  if (!user.assignedBooth || String(boothId) !== String(user.assignedBooth._id || user.assignedBooth)) {
    const err = new Error('Booth user cannot access other booth data');
    err.status = 403;
    throw err;
  }
};

exports.assertWardAccess = (user, wardId) => {
  if (user.role !== 'ward_head') return;
  if (!user.assignedWard || String(wardId) !== String(user.assignedWard._id || user.assignedWard)) {
    const err = new Error('Ward head cannot access other ward data');
    err.status = 403;
    throw err;
  }
};


exports.requirePermission = (user, permission) => {
  if (user.role === 'admin' || user.permissions?.[permission] === true) return;
  // Managers created before granular permissions were added retain the
  // original create/edit/photo behaviour until admin explicitly changes it.
  if (user.permissions?.[permission] === undefined &&
      ['canCreateVoters', 'canEditVoters', 'canEditPhoto'].includes(permission)) return;
  const err = new Error(`Permission denied: ${permission}`);
  err.status = 403;
  throw err;
};
