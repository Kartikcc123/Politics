const ImportReview = require('../models/ImportReview');
const Member = require('../models/Member');
const { requireValidEpic } = require('../utils/epic');

exports.list = async (req, res, next) => {
  try {
    res.json(await ImportReview.find({ status: req.query.status || 'pending' })
      .populate('ward booth resolvedMember')
      .sort({ createdAt: -1 }));
  } catch (error) { next(error); }
};

exports.resolve = async (req, res, next) => {
  try {
    const review = await ImportReview.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review record not found' });
    const voterId = requireValidEpic(req.body.voterId);
    let member = await Member.findOne({ voterId });
    if (member) {
      Object.assign(member, review.suggestedData, {
        voterId: member.voterId,
        ward: member.ward || review.ward,
        booth: member.booth || review.booth,
        updatedBy: req.currentUser._id,
      });
      await member.save();
    } else {
      member = await Member.create({
        ...review.suggestedData,
        voterId,
        ward: review.ward,
        booth: review.booth,
        createdBy: req.currentUser._id,
        updatedBy: req.currentUser._id,
        verificationStatus: 'needs_review',
      });
    }
    const verifiedSnapshot = {
      name: String(member.name || '').trim(),
      guardianName: String(member.guardianName || '').trim(),
      houseNumber: String(member.houseNumber || '').trim(),
      age: member.age ?? null,
      gender: member.gender || '',
      voterId: member.voterId || '',
      voterSerial: String(member.voterSerial || '').trim(),
    };
    member.ocrValues = {
      raw: review.rawData || member.ocrValues?.raw || {},
      suggested: member.ocrValues?.suggested || {},
      verified: verifiedSnapshot,
      status: 'verified',
      verifiedBy: req.currentUser._id,
      verifiedAt: new Date(),
    };
    member.verificationStatus = 'verified';
    await member.save();
    Object.assign(review, {
      verifiedData: verifiedSnapshot,
      status: 'resolved',
      resolvedMember: member._id,
      resolvedBy: req.currentUser._id,
      resolvedAt: new Date(),
    });
    await review.save();
    res.json({ review, member });
  } catch (error) { next(error); }
};

exports.ignore = async (req, res, next) => {
  try {
    res.json(await ImportReview.findByIdAndUpdate(req.params.id, {
      status: 'ignored',
      resolvedBy: req.currentUser._id,
      resolvedAt: new Date(),
    }, { new: true }));
  } catch (error) { next(error); }
};
