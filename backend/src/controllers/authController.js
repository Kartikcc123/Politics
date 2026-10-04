const { validationResult } = require('express-validator');
let bcrypt;
try {
  bcrypt = require('bcrypt');
  if (typeof bcrypt.hash !== 'function') throw new Error('Native bcrypt binding failed');
} catch (_) {
  bcrypt = require('bcryptjs');
}
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Booth = require('../models/Booth');
const Member = require('../models/Member');
const Activity = require('../models/Activity');

const publicUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  return obj;
};

const sign = (user) => jwt.sign(
  { user: { id: user._id, role: user.role } },
  process.env.JWT_SECRET || 'change-this-secret',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
);

const throwBadRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  throw err;
};

const requireBooth = async (assignedBooth) => {
  if (!assignedBooth) throwBadRequest('Booth head requires assignedBooth');
  const booth = await Booth.findById(assignedBooth).populate('ward');
  if (!booth) throwBadRequest('Assigned booth was not found');
  return booth;
};

const normalizeUserPayload = async (body, existingUser) => {
  const data = { ...body };
  const role = data.role || existingUser?.role || 'user';
  data.role = role;

  if (data.assignedBooth && mongoose.Types.ObjectId.isValid(data.assignedBooth)) {
    try {
      const booth = await Booth.findById(data.assignedBooth).populate('ward');
      if (booth) {
        data.assignedBooth = booth._id;
        data.assignedWard = booth.ward?._id || booth.ward;
      }
    } catch (_) {}
  } else if (!data.assignedBooth) {
    data.assignedBooth = undefined;
  }

  if (role === 'admin') {
    data.assignedBooth = undefined;
    data.assignedWard = undefined;
    data.assignedGramPanchayats = [];
    data.assignedVillages = [];
    data.assignedWards = [];
    data.assignedParts = [];
  }

  if (Array.isArray(data.assignedGramPanchayats)) {
    data.assignedGramPanchayats = data.assignedGramPanchayats.filter(Boolean).map(s => String(s).trim());
  }
  if (Array.isArray(data.assignedVillages)) {
    data.assignedVillages = data.assignedVillages.filter(Boolean).map(s => String(s).trim());
  }
  if (Array.isArray(data.assignedWards)) {
    data.assignedWards = data.assignedWards.filter(Boolean).map(s => String(s).trim());
  }
  if (Array.isArray(data.assignedParts)) {
    data.assignedParts = data.assignedParts.filter(Boolean).map(s => String(s).trim());
  }
  if (data.assignedVoterId) {
    data.assignedVoterId = String(data.assignedVoterId).trim();
  }

  return data;
};

const defaultStats = () => ({
  totalActivities: 0,
  votersCreated: 0,
  votersUpdated: 0,
  votersDeleted: 0,
  createdByCount: 0,
  updatedByCount: 0,
  boothVoterCount: 0,
});

const userWorkStats = async () => {
  const [activityRows, createdRows, updatedRows, boothRows] = await Promise.all([
    Activity.aggregate([
      { $match: { actor: { $ne: null } } },
      {
        $group: {
          _id: '$actor',
          totalActivities: { $sum: 1 },
          votersCreated: { $sum: { $cond: [{ $eq: ['$action', 'member.created'] }, 1, 0] } },
          votersUpdated: { $sum: { $cond: [{ $eq: ['$action', 'member.updated'] }, 1, 0] } },
          votersDeleted: { $sum: { $cond: [{ $eq: ['$action', 'member.deleted'] }, 1, 0] } },
          lastActivityAt: { $max: '$createdAt' },
        },
      },
    ]),
    Member.aggregate([
      { $match: { createdBy: { $ne: null } } },
      { $group: { _id: '$createdBy', createdByCount: { $sum: 1 } } },
    ]),
    Member.aggregate([
      { $match: { updatedBy: { $ne: null } } },
      { $group: { _id: '$updatedBy', updatedByCount: { $sum: 1 } } },
    ]),
    Member.aggregate([
      { $match: { booth: { $ne: null } } },
      { $group: { _id: '$booth', boothVoterCount: { $sum: 1 } } },
    ]),
  ]);

  const stats = new Map();
  const ensure = (key) => {
    const id = String(key);
    if (!stats.has(id)) stats.set(id, {});
    return stats.get(id);
  };

  activityRows.forEach((row) => {
    const { _id, ...rest } = row;
    Object.assign(ensure(_id), rest);
  });
  createdRows.forEach((row) => {
    ensure(row._id).createdByCount = row.createdByCount;
  });
  updatedRows.forEach((row) => {
    ensure(row._id).updatedByCount = row.updatedByCount;
  });
  boothRows.forEach((row) => {
    ensure(`booth:${row._id}`).boothVoterCount = row.boothVoterCount;
  });

  return stats;
};

const statsForUser = (stats, user) => ({
  ...defaultStats(),
  ...(stats.get(String(user._id)) || {}),
  ...(user.assignedBooth ? stats.get(`booth:${user.assignedBooth._id || user.assignedBooth}`) || {} : {}),
});

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const data = await normalizeUserPayload(req.body);
    if (data.role === 'admin' && req.currentUser && req.currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create admin users' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'User already exists' });

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ ...data, name, email, password: hash });
    const populated = await User.findById(user._id).populate('assignedWard assignedBooth');
    res.status(201).json({ token: sign(user), user: publicUser(populated) });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password').populate('assignedWard assignedBooth');
    if (!user || !user.active) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.currentUser._id).populate('assignedWard assignedBooth');
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const [users, stats] = await Promise.all([
      User.find().populate('assignedWard assignedBooth').sort({ createdAt: -1 }),
      userWorkStats(),
    ]);
    res.json(users.map((user) => ({
      ...publicUser(user),
      workStats: statsForUser(stats, user),
    })));
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const existing = await User.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'User not found' });
    const data = await normalizeUserPayload(req.body, existing);
    if (data.password) data.password = await bcrypt.hash(data.password, 12);
    const user = await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
      .populate('assignedWard assignedBooth');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
};

exports.userWorkSummary = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('assignedWard assignedBooth');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const [recentActivities, stats] = await Promise.all([
      Activity.find({ actor: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      userWorkStats(),
    ]);
    res.json({
      user: publicUser(user),
      stats: statsForUser(stats, user),
      recentActivities,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeUser = async (req, res, next) => {
  try {
    if (String(req.currentUser?._id || req.currentUser?.id || '') === String(req.params.id)) {
      return res.status(400).json({ message: 'You cannot delete your own user.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

exports.hierarchyOptions = async (req, res, next) => {
  try {
    const Member = require('../models/Member');
    const [gps, gpBreakdown, parts] = await Promise.all([
      Member.distinct('gramPanchayat', { gramPanchayat: { $nin: ['', null] } }),
      Member.aggregate([
        { $match: { gramPanchayat: { $nin: ['', null] } } },
        {
          $group: {
            _id: { gp: '$gramPanchayat', ward: '$wardNumber', village: '$village' },
            count: { $sum: 1 }
          }
        }
      ]),
      Member.distinct('partNumber', { partNumber: { $nin: ['', null] } })
    ]);

    const gpMap = {};
    for (const gp of gps.filter(Boolean).sort()) {
      gpMap[gp] = { name: gp, wards: new Set(), villages: new Set(), totalVoters: 0 };
    }

    for (const item of gpBreakdown) {
      const gp = item._id.gp;
      if (!gpMap[gp]) gpMap[gp] = { name: gp, wards: new Set(), villages: new Set(), totalVoters: 0 };
      if (item._id.ward && item._id.ward !== 'NO_WARD') gpMap[gp].wards.add(String(item._id.ward));
      if (item._id.village && item._id.village !== 'NO_VILLAGE') gpMap[gp].villages.add(String(item._id.village));
      gpMap[gp].totalVoters += (item.count || 0);
    }

    const panchayats = Object.values(gpMap).map(gp => ({
      name: gp.name,
      totalVoters: gp.totalVoters,
      wards: Array.from(gp.wards).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)),
      villages: Array.from(gp.villages).sort()
    })).sort((a, b) => a.name.localeCompare(b.name, 'hi-IN'));

    const sortedParts = parts
      .filter(Boolean)
      .map(String)
      .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

    res.json({
      samiti: 'रायपुर (सहाड़ा विधानसभा)',
      panchayats,
      parts: sortedParts
    });
  } catch (error) {
    next(error);
  }
};

