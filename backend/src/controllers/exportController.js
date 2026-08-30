const fs = require('fs');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const path = require('path');
const Member = require('../models/Member');
const { resolveUploadPublicPath } = require('../utils/uploadPath');
const Activity = require('../models/Activity');
const Family = require('../models/Family');
const { applyMemberScope, assertBoothAccess } = require('../utils/boothAccess');

const regularFont = path.join(__dirname, '../assets/fonts/Nirmala.ttf');
const boldFont = path.join(__dirname, '../assets/fonts/Nirmala-Bold.ttf');

const preparePdf = (doc) => {
  doc.registerFont('Hindi', regularFont);
  doc.registerFont('HindiBold', boldFont);
  doc.font('Hindi');
};

const buildFilter = (req) => {
  const filter = applyMemberScope(req.currentUser, {});
  const { ward, booth, party, supportLevel, dobMonth, anniversaryMonth, ids } = req.query;
  if (req.currentUser.role === 'admin') {
    if (ward) filter.ward = ward;
    if (booth) filter.booth = booth;
  }
  if (party) filter.party = party;
  if (supportLevel) filter.supportLevel = supportLevel;
  if (ids) filter._id = { $in: ids.split(',').map((id) => id.trim()).filter(Boolean) };
  if (dobMonth) filter.$expr = { $eq: [{ $month: '$dob' }, Number(dobMonth)] };
  if (anniversaryMonth) filter.$expr = { $eq: [{ $month: '$anniversary' }, Number(anniversaryMonth)] };
  return filter;
};

const drawMemberProfile = (doc, member, index = 0) => {
  if (index > 0) doc.addPage();
  doc.rect(28, 28, 539, 785).stroke('#d1d5db');
  doc.font('HindiBold').fontSize(18).fillColor('#111827').text('Political Booth Management CRM', 45, 42);
  doc.font('Hindi').fontSize(10).fillColor('#6b7280').text('मतदाता सदस्य प्रोफाइल', 45, 66);
  if (member.party?.logo?.endsWith('.svg')) {
    doc.font('Hindi').fontSize(9).fillColor(member.party?.color || '#111827').text(member.party?.code || member.party?.name || '-', 485, 45, { align: 'right' });
  }
  if (member.photo) {
    try { const image = resolveUploadPublicPath(member.photo); if (fs.existsSync(image)) doc.image(image, 45, 95, { width: 90, height: 100, fit: [90, 100] }); else doc.rect(45, 95, 90, 100).stroke(); } catch (e) { doc.rect(45, 95, 90, 100).stroke(); }
  } else {
    doc.rect(45, 95, 90, 100).stroke().font('Hindi').fontSize(9).fillColor('#6b7280').text('फोटो', 77, 140);
  }
  doc.font('HindiBold').fontSize(16).fillColor('#111827').text(`${member.name} ${member.surname || ''}`, 155, 95);
  doc.font('Hindi').fontSize(10).fillColor('#374151');
  const rows = [
    ['मोबाइल', member.mobile],
    ['वैकल्पिक मोबाइल', member.altMobile],
    ['जन्म तिथि', member.dob ? member.dob.toLocaleDateString('hi-IN') : '-'],
    ['वर्षगांठ', member.anniversary ? member.anniversary.toLocaleDateString('hi-IN') : '-'],
    ['लिंग', member.gender],
    ['वार्ड', member.ward?.number || member.ward?.name],
    ['बूथ', member.booth?.number || member.booth?.name],
    ['मतदाता आईडी', member.voterId],
    ['घर संख्या', member.houseNumber],
    ['अनुभाग', member.sectionName || member.sectionNumber],
    ['समर्थन', member.supportLevel],
    ['व्यवसाय', member.occupation],
    ['शिक्षा', member.education],
    ['पता', member.address],
    ['स्थान', member.location],
  ];
  let y = 125;
  for (const [label, value] of rows) {
    doc.fillColor('#6b7280').text(`${label}:`, 155, y, { width: 80 });
    doc.fillColor('#111827').text(value || '-', 240, y, { width: 290 });
    y += 18;
  }
  doc.font('HindiBold').moveDown().fillColor('#111827').text('परिवार', 45, 250);
  y = 270;
  (member.family || []).slice(0, 8).forEach((f) => {
    doc.font('Hindi').fontSize(9).text(`${f.name || '-'} | ${f.relation || '-'} | ${f.mobile || '-'}`, 55, y);
    y += 15;
  });
  doc.font('HindiBold').fontSize(10).text('अतिरिक्त जानकारी', 45, 410);
  y = 430;
  (member.extraDetails || []).slice(0, 12).forEach((d) => {
    doc.font('Hindi').fontSize(9).text(`${d.label || '-'}: ${d.value || '-'}`, 55, y);
    y += 15;
  });
  doc.font('HindiBold').fontSize(10).text('टिप्पणी', 45, 625);
  doc.font('Hindi').fontSize(9).text(member.notes || '-', 55, 645, { width: 470, height: 80 });
  if (member.qrCode) {
    try { doc.image(Buffer.from(member.qrCode.split(',')[1], 'base64'), 455, 690, { width: 75 }); } catch (e) {}
  }
};

exports.profilePdf = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id).populate('ward booth party createdBy updatedBy');
    if (!member) return res.status(404).json({ message: 'Member not found' });
    assertBoothAccess(req.currentUser, member.booth?._id || member.booth);
    if (req.currentUser.role === 'booth' && !req.currentUser.permissions?.canPrintProfiles) {
      return res.status(403).json({ message: 'Profile printing is disabled for this booth user' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="member-${member._id}.pdf"`);
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    preparePdf(doc);
    doc.pipe(res);
    drawMemberProfile(doc, member);
    doc.end();
  } catch (e) { next(e); }
};

exports.bulkProfilesPdf = async (req, res, next) => {
  try {
    const members = await Member.find(buildFilter(req)).populate('ward booth party createdBy updatedBy').sort({ ward: 1, booth: 1, name: 1 }).collation({ locale: 'en', numericOrdering: true, strength: 1 }).limit(500);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="member-profiles-bulk.pdf"');
    const doc = new PDFDocument({ size: 'A4', margin: 28 });
    preparePdf(doc);
    doc.pipe(res);
    members.forEach((member, index) => drawMemberProfile(doc, member, index));
    if (!members.length) doc.font('Hindi').fontSize(16).text('चुने गए फ़िल्टर में कोई सदस्य नहीं मिला।');
    doc.end();
  } catch (e) { next(e); }
};

exports.membersXlsx = async (req, res, next) => {
  try {
    const members = await Member.find(buildFilter(req)).populate('ward booth party').lean();
    const rows = members.map((m) => ({
      Name: m.name,
      Surname: m.surname,
      Mobile: m.mobile,
      Address: m.address,
      Location: m.location,
      Ward: m.ward?.number,
      Booth: m.booth?.number,
      Party: m.party?.name,
      Support: m.supportLevel,
      Verification: m.verificationStatus,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Members');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Disposition', 'attachment; filename="members-export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (e) { next(e); }
};

exports.backup = async (req, res, next) => {
  try {
    const members = await Member.find(applyMemberScope(req.currentUser, {})).lean();
    const activities = req.currentUser.role === 'admin' ? await Activity.find().lean() : [];
    res.json({ exportedAt: new Date(), members, activities });
  } catch (e) { next(e); }
};

