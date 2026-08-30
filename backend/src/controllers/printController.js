const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Member = require('../models/Member');
const MediaAsset = require('../models/MediaAsset');
const { applyMemberScope } = require('../utils/boothAccess');
const { resolveUploadPublicPath } = require('../utils/uploadPath');

const regularFont = path.join(__dirname, '../assets/fonts/Nirmala.ttf');
const boldFont = path.join(__dirname, '../assets/fonts/Nirmala-Bold.ttf');

const labels = {
  gender: { male: 'पुरुष', female: 'महिला', other: 'अन्य' },
  relation: { father: 'पिता', husband: 'पति', mother: 'माता', other: 'अन्य' },
  support: { supporter: 'समर्थक', opposite: 'विरोधी', neutral: 'तटस्थ', undecided: 'अनिर्णीत' },
};

const fields = {
  name: ['नाम', (m) => `${m.name || ''} ${m.surname || ''}`.trim()],
  voterId: ['EPIC', (m) => m.voterId],
  mobile: ['मोबाइल', (m) => m.mobile],
  altMobile: ['वैकल्पिक मोबाइल', (m) => m.altMobile],
  guardianName: ['पिता/पति', (m) => m.guardianName],
  relationType: ['संबंध', (m) => labels.relation[m.relationType] || m.relationType],
  age: ['उम्र', (m) => m.age],
  gender: ['लिंग', (m) => labels.gender[m.gender] || m.gender],
  houseNumber: ['घर संख्या', (m) => m.houseNumber],
  address: ['पता', (m) => m.address],
  village: ['गाँव', (m) => m.village || m.location],
  gramPanchayat: ['ग्राम पंचायत', (m) => m.gramPanchayat],
  tehsil: ['तहसील', (m) => m.tehsil],
  municipality: ['नगर पालिका', (m) => m.municipality],
  caste: ['जाति', (m) => m.caste],
  subCaste: ['उपजाति', (m) => m.subCaste],
  occupation: ['व्यवसाय', (m) => m.occupation],
  education: ['शिक्षा', (m) => m.education],
  organizationPost: ['पद', (m) => m.organizationPost],
  supportLevel: ['समर्थन', (m) => labels.support[m.supportLevel] || m.supportLevel],
  assembly: ['विधानसभा', (m) => [m.assemblyNumber, m.assemblyName].filter(Boolean).join(' - ')],
  partNumber: ['भाग', (m) => m.partNumber],
  section: ['अनुभाग', (m) => [m.sectionNumber, m.sectionName].filter(Boolean).join(' - ')],
  booth: ['बूथ', (m) => m.booth?.number || m.partNumber],
  ward: ['वार्ड', (m) => m.ward?.number || m.ward?.name],
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyPrintFilters(req, filter) {
  const q = String(req.query.q || '').trim();
  if (q) filter.$or = [
    'name', 'surname', 'mobile', 'altMobile', 'voterId', 'guardianName',
    'houseNumber', 'address', 'location', 'village', 'gramPanchayat',
    'tehsil', 'municipality', 'caste', 'organizationPost', 'sectionName',
    'assemblyName', 'partNumber',
  ].map((key) => ({ [key]: new RegExp(escapeRegex(q), 'i') }));

  for (const key of [
    'village', 'gramPanchayat', 'tehsil', 'municipality', 'caste',
    'organizationPost', 'location', 'sectionName', 'assemblyName',
  ]) {
    if (req.query[key]) filter[key] = new RegExp(escapeRegex(req.query[key]), 'i');
  }
  for (const key of [
    'supportLevel', 'area', 'gender', 'verificationStatus', 'assemblyNumber',
    'partNumber', 'sectionNumber',
  ]) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (req.query.letter) {
    filter.name = new RegExp(`^${escapeRegex(String(req.query.letter).trim())}`, 'i');
  }
  if (req.query.missingMobile === 'true') {
    filter.$and = [...(filter.$and || []), { $or: [{ mobile: '' }, { mobile: null }, { mobile: { $exists: false } }] }];
  }
  if (req.query.missingHouse === 'true') {
    filter.$and = [...(filter.$and || []), { $or: [{ houseNumber: '' }, { houseNumber: null }, { houseNumber: { $exists: false } }] }];
  }

  const ids = String(req.query.ids || '').split(',').map((id) => id.trim()).filter(Boolean);
  const excluded = String(req.query.excludedIds || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length && req.query.selectAll !== 'true') filter._id = { $in: ids };
  if (excluded.length) {
    filter._id = filter._id || {};
    filter._id.$nin = excluded;
  }
}

function mediaIdFromPhoto(photo) {
  const raw = String(photo || '').trim();
  let value = raw;
  try { value = new URL(raw).pathname; } catch (_) {}
  const match = value.match(/\/media\/([a-f0-9]{24})(?:$|[/?#])/i);
  return match ? match[1] : null;
}

function photoPath(member) {
  if (!member.photo || mediaIdFromPhoto(member.photo)) return null;
  const raw = String(member.photo).trim();
  let value = raw;
  try { value = new URL(raw).pathname; } catch (_) {}
  if (/^https?:/i.test(value)) return null;
  const relative = String(value).replace(/^[/\\]+/, '');
  const candidates = [
    resolveUploadPublicPath(value),
    path.resolve(process.cwd(), relative),
    path.resolve(__dirname, '../../', relative),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function normalizeImageBuffer(value) {
  if (!value) return null;
  const buffer = Buffer.isBuffer(value)
    ? value
    : value?.buffer
      ? Buffer.from(value.buffer)
      : Buffer.from(value);
  if (buffer.length < 8) return null;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  return isJpeg || isPng ? buffer : null;
}

async function loadPhotoSources(members) {
  const mediaIds = [...new Set(members.map((member) => mediaIdFromPhoto(member.photo)).filter(Boolean))];
  const media = new Map();
  if (mediaIds.length) {
    const assets = await MediaAsset.find({ _id: { $in: mediaIds } }).select('+data contentType').lean();
    for (const asset of assets) {
      const buffer = normalizeImageBuffer(asset.data);
      if (buffer) media.set(String(asset._id), buffer);
      else console.warn('Printable voter photo is not a supported JPEG/PNG media asset:', String(asset._id));
    }
  }
  return (member) => {
    const mediaId = mediaIdFromPhoto(member.photo);
    if (mediaId) return media.get(mediaId) || null;
    return photoPath(member);
  };
}

function fieldRows(doc, member, selected, width) {
  return selected.map((key) => {
    const [label, getter] = fields[key];
    const value = getter(member);
    const text = `${label}: ${value === undefined || value === null || value === '' ? '-' : value}`;
    const name = key === 'name';
    doc.font(name ? 'HindiBold' : 'Hindi').fontSize(name ? 10 : 8.5);
    return {
      key,
      text,
      height: Math.max(name ? 17 : 14, doc.heightOfString(text, { width, lineGap: 1 }) + 3),
    };
  });
}

exports.printMembers = async (req, res, next) => {
  try {
    const filter = applyMemberScope(req.currentUser, {});
    applyPrintFilters(req, filter);
    const members = await Member.find(filter)
      .populate('booth ward')
      .sort({ village: 1, houseNumber: 1, name: 1 })
      .collation({ locale: 'en', numericOrdering: true, strength: 1 })
      .limit(5000)
      .lean();
    const getPhotoSource = await loadPhotoSources(members);

    const selected = [...new Set(String(req.query.fields || 'name,voterId,mobile,village,booth')
      .split(',').map((key) => key.trim()).filter((key) => fields[key]))];
    const columns = Math.max(1, Math.min(3, Number(req.query.columns || 1)));
    const includePhoto = req.query.photo !== 'false';
    const paperSize = ['A4', 'A3', 'LETTER'].includes(String(req.query.paperSize).toUpperCase())
      ? String(req.query.paperSize).toUpperCase() : 'A4';
    const orientation = req.query.orientation === 'landscape' ? 'landscape' : 'portrait';
    const title = String(req.query.title || 'मतदाता सूची').slice(0, 100);
    const doc = new PDFDocument({ size: paperSize, layout: orientation, margin: 28, bufferPages: true });
    doc.registerFont('Hindi', regularFont).registerFont('HindiBold', boldFont).font('Hindi');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="custom-voter-list.pdf"');
    doc.pipe(res);

    const margin = 28;
    const gap = 10;
    const usableWidth = doc.page.width - margin * 2;
    const cardWidth = (usableWidth - gap * (columns - 1)) / columns;
    const photoWidth = includePhoto ? 58 : 0;
    const textWidth = cardWidth - 18 - photoWidth;
    const topY = 64;
    const bottomY = doc.page.height - 38;

    const drawHeader = () => {
      doc.font('HindiBold').fontSize(15).fillColor('#071b4b').text(title, margin, 25, { width: usableWidth - 120 });
      doc.font('Hindi').fontSize(8.5).fillColor('#667394').text(`कुल मतदाता: ${members.length}`, doc.page.width - margin - 115, 29, { width: 115, align: 'right' });
      doc.moveTo(margin, 53).lineTo(doc.page.width - margin, 53).strokeColor('#dbe4f2').stroke();
      doc.fillColor('#111827');
    };

    drawHeader();
    let y = topY;
    for (let index = 0; index < members.length; index += columns) {
      const rowMembers = members.slice(index, index + columns);
      const prepared = rowMembers.map((member) => {
        const rows = fieldRows(doc, member, selected, textWidth);
        const contentHeight = rows.reduce((sum, row) => sum + row.height, 0);
        return { member, rows, height: Math.max(includePhoto ? 84 : 48, contentHeight + 18) };
      });
      const rowHeight = Math.max(...prepared.map((item) => item.height));
      if (y + rowHeight > bottomY && y > topY) {
        doc.addPage();
        drawHeader();
        y = topY;
      }

      prepared.forEach((item, column) => {
        const x = margin + column * (cardWidth + gap);
        doc.roundedRect(x, y, cardWidth, rowHeight, 8).lineWidth(.8).strokeColor('#cbd5e1').stroke();
        doc.roundedRect(x, y, cardWidth, Math.min(22, rowHeight), 8).fillOpacity(0.05).fillAndStroke('#2563eb', '#cbd5e1').fillOpacity(1);
        let textX = x + 9;
        if (includePhoto) {
          const image = getPhotoSource(item.member);
          if (image) {
            try {
              doc.roundedRect(x + 9, y + 10, 48, 62, 3).strokeColor('#dbe4f2').stroke();
              doc.image(image, x + 9, y + 10, { fit: [48, 62], align: 'center', valign: 'center' });
            }
            catch (error) {
              console.warn('Failed to draw voter photo in PDF:', item.member.voterId || item.member._id, error.message);
              doc.roundedRect(x + 9, y + 10, 48, 62, 3).strokeColor('#dbe4f2').stroke();
              doc.font('Hindi').fontSize(6).fillColor('#94a3b8').text('Photo', x + 9, y + 36, { width: 48, align: 'center' });
            }
          } else {
            doc.roundedRect(x + 9, y + 10, 48, 62, 3).strokeColor('#dbe4f2').stroke();
            doc.font('Hindi').fontSize(6).fillColor('#94a3b8').text('Photo', x + 9, y + 36, { width: 48, align: 'center' });
          }
          textX += photoWidth;
        }
        let lineY = y + 9;
        for (const row of item.rows) {
          const isName = row.key === 'name';
          doc.font(isName ? 'HindiBold' : 'Hindi')
            .fontSize(isName ? 10 : 8.5)
            .fillColor(isName ? '#071b4b' : '#1f2937')
            .text(row.text, textX, lineY, { width: textWidth, lineGap: 1 });
          lineY += row.height;
        }
      });
      y += rowHeight + gap;
    }

    if (!members.length) {
      doc.font('Hindi').fontSize(14).fillColor('#667394').text('चुने गए फ़िल्टर में कोई मतदाता नहीं मिला।', margin, 90, { align: 'center', width: usableWidth });
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(pages.start + i);
      doc.font('Hindi').fontSize(8).fillColor('#667394')
        .text(`पृष्ठ ${i + 1} / ${pages.count}`, margin, doc.page.height - 24, { width: usableWidth, align: 'center' });
    }
    doc.end();
  } catch (error) { next(error); }
};

