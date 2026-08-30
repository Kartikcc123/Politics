const Member = require('../models/Member');
const { applyMemberScope, assertBoothAccess, assertWardAccess } = require('../utils/boothAccess');

exports.list = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const members = await Member.find({
      ...applyMemberScope(req.currentUser, {}),
      'followUps.status': status,
    }).select('name surname mobile voterId village organizationPost followUps');
    const items = members.flatMap((member) => member.followUps
      .filter((item) => item.status === status)
      .map((followUp) => ({ member, followUp })))
      .sort((a, b) => new Date(a.followUp.dueAt) - new Date(b.followUp.dueAt));
    res.json(items);
  } catch (error) { next(error); }
};

exports.dashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const members = await Member.find({
      ...applyMemberScope(req.currentUser, {}),
      'followUps.status': 'pending',
    }).select('name surname mobile voterId village organizationPost followUps');
    const result = { overdue: [], today: [], upcoming: [] };
    for (const member of members) {
      for (const followUp of member.followUps.filter((item) => item.status === 'pending')) {
        const target = new Date(followUp.dueAt) < start ? result.overdue : new Date(followUp.dueAt) < end ? result.today : result.upcoming;
        target.push({ member, followUp });
      }
    }
    for (const items of Object.values(result)) items.sort((a, b) => new Date(a.followUp.dueAt) - new Date(b.followUp.dueAt));
    res.json(result);
  } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Voter not found' });
    assertBoothAccess(req.currentUser, member.booth);
    assertWardAccess(req.currentUser, member.ward);
    member.followUps.push({ ...req.body, createdBy: req.currentUser._id });
    await member.save();
    res.status(201).json(member.followUps.at(-1));
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Voter not found' });
    assertBoothAccess(req.currentUser, member.booth);
    assertWardAccess(req.currentUser, member.ward);
    const followUp = member.followUps.id(req.params.followUpId);
    if (!followUp) return res.status(404).json({ message: 'Follow-up not found' });
    Object.assign(followUp, req.body);
    if (req.body.status === 'done' && !followUp.completedAt) followUp.completedAt = new Date();
    await member.save();
    res.json(followUp);
  } catch (error) { next(error); }
};

