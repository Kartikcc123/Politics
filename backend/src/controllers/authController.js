const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
  const role = data.role || existingUser?.role || 'booth';
  data.role = role;

  if (role === 'booth') {
    const booth = await requireBooth(data.assignedBooth || existingUser?.assignedBooth);
    data.assignedBooth = booth._id;
    data.assignedWard = booth.ward?._id || booth.ward;
  } else if (role === 'ward_head') {
    if (!data.assignedWard && !existingUser?.assignedWard) {
      throwBadRequest('Ward head requires assignedWard');
    }
    data.assignedBooth = undefined;
  } else if (role === 'admin') {
    data.assignedBooth = undefined;
    data.assignedWard = undefined;
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
