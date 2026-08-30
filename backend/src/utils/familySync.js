const Family = require('../models/Family');
const Member = require('../models/Member');

const clean = (value) => String(value || '').trim();

const syncMemberFamily = async (member, userId) => {
  await Family.updateMany(
    { members: member._id },
    { $pull: { members: member._id }, $set: { updatedBy: userId } },
  );
  await Family.deleteMany({ members: { $size: 0 } });

  const houseNumber = clean(member.houseNumber);
  const group = houseNumber
    ? await Member.find({
      booth: member.booth,
      sectionNumber: clean(member.sectionNumber),
      sectionName: clean(member.sectionName),
      houseNumber,
    })
    : [member];
  const head = [...group].sort((a, b) => (Number(b.age) || 0) - (Number(a.age) || 0))[0];
  const filter = houseNumber
    ? {
      booth: head.booth,
      sectionNumber: clean(head.sectionNumber),
      sectionName: clean(head.sectionName),
      houseNumber,
    }
    : { booth: head.booth, members: head._id };

  return Family.findOneAndUpdate(
    filter,
    {
      familyHead: head._id,
      headName: head.name,
      houseNumber,
      sectionNumber: clean(head.sectionNumber),
      sectionName: clean(head.sectionName),
      address: head.address,
      ward: head.ward,
      booth: head.booth,
      members: group.map((item) => item._id),
      updatedBy: userId,
      $setOnInsert: { createdBy: userId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const removeMemberFromFamilies = async (memberId, userId) => {
  await Family.updateMany(
    { members: memberId },
    { $pull: { members: memberId }, $set: { updatedBy: userId } },
  );
  await Family.deleteMany({ members: { $size: 0 } });
};

module.exports = { syncMemberFamily, removeMemberFromFamilies };
