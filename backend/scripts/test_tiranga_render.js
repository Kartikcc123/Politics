const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { execSync } = require('child_process');

async function testTirangaDesign() {
  const doc = new PDFDocument({ size: 'A4', margin: 15 });
  const regularFont = path.join(__dirname, '..', 'src', 'assets', 'fonts', 'Nirmala.ttf');
  const boldFont = path.join(__dirname, '..', 'src', 'assets', 'fonts', 'Nirmala-Bold.ttf');
  doc.registerFont('Hindi', regularFont).registerFont('HindiBold', boldFont).font('Hindi');

  const outPdf = path.join(__dirname, '..', 'test_tiranga_card.pdf');
  const stream = fs.createWriteStream(outPdf);
  doc.pipe(stream);

  const cardWidth = 278;
  const cardHeight = 156;
  const x = 18;
  const y = 20;

  // 1. Draw Tiranga Double Border
  // Outer Green
  doc.roundedRect(x, y, cardWidth, cardHeight, 4.5).lineWidth(1.2).strokeColor('#0e8742').stroke();
  // Inner Saffron
  doc.roundedRect(x + 1.8, y + 1.8, cardWidth - 3.6, cardHeight - 3.6, 3.0).lineWidth(0.9).strokeColor('#f37021').stroke();

  // Top center break for voting finger
  doc.rect(x + cardWidth / 2 - 5, y - 1.5, 10, 4.0).fillColor('#ffffff').fill();

  // Load voting finger emblem
  const vPath = path.join(__dirname, '..', 'src', 'assets', 'voting_finger_emblem.png');
  const votingImg = doc.openImage(fs.readFileSync(vPath));
  const iconW = 34;
  const iconH = 17;
  doc.image(votingImg, x + cardWidth / 2 - iconW / 2, y - 4.5, { width: iconW, height: iconH });

  // Banner height
  const bannerH = 63;
  const photoR = 19;
  const photoCY = y + 2 + (bannerH - 2) / 2;
  const leftCX = x + 8 + photoR;
  const rightCX = x + cardWidth - 8 - photoR;

  // Photos
  const candPhotoPath = path.join(__dirname, '../uploads/candidate_sandeep_clean.png');
  let candImg = null;
  if (fs.existsSync(candPhotoPath)) candImg = doc.openImage(fs.readFileSync(candPhotoPath));
  const leaderPhotoPath = path.join(__dirname, '../uploads/leader_senior_clean.png');
  let leaderImg = null;
  if (fs.existsSync(leaderPhotoPath)) leaderImg = doc.openImage(fs.readFileSync(leaderPhotoPath));

  if (candImg) {
    doc.save();
    doc.circle(leftCX, photoCY, photoR).clip();
    doc.image(candImg, leftCX - photoR, photoCY - photoR, { width: photoR * 2, height: photoR * 2, fit: [photoR * 2, photoR * 2] });
    doc.restore();
    doc.circle(leftCX, photoCY, photoR + 1.5).lineWidth(1.6).strokeColor('#d4af37').stroke();
    doc.circle(leftCX, photoCY, photoR + 2.4).lineWidth(0.6).strokeColor('#f59e0b').stroke();
  }

  if (leaderImg) {
    doc.save();
    doc.circle(rightCX, photoCY, photoR).clip();
    doc.image(leaderImg, rightCX - photoR, photoCY - photoR, { width: photoR * 2, height: photoR * 2, fit: [photoR * 2, photoR * 2] });
    doc.restore();
    doc.circle(rightCX, photoCY, photoR + 1.5).lineWidth(1.6).strokeColor('#d4af37').stroke();
    doc.circle(rightCX, photoCY, photoR + 2.4).lineWidth(0.6).strokeColor('#f59e0b').stroke();
  }

  // Party symbol
  const pPath = path.join(__dirname, '..', 'src', 'assets', 'default_party_symbol.png');
  const partyImg = doc.openImage(fs.readFileSync(pPath));
  const symbolR = 11.5;
  const symbolCX = rightCX - photoR - symbolR - 3.5;
  const symbolCY = y + 4.0 + symbolR;

  doc.save();
  doc.circle(symbolCX, symbolCY, symbolR).fillColor('#ffffff').fill();
  doc.circle(symbolCX, symbolCY, symbolR).clip();
  doc.image(partyImg, symbolCX - symbolR, symbolCY - symbolR, { width: symbolR * 2, height: symbolR * 2, fit: [symbolR * 2, symbolR * 2] });
  doc.restore();
  doc.circle(symbolCX, symbolCY, symbolR).lineWidth(0.6).strokeColor('#0e8742').stroke();

  // Typography
  const textLeft = leftCX + photoR + 3;
  const textRight = rightCX - photoR - 3;
  const textWidth = textRight - textLeft;

  let curY = y + 13.2;
  const h1Size = 6.2;
  const h2Size = 5.8;
  const nameSize = 10.5;
  const tagSize = 5.0;
  const slogSize = 5.0;
  const phoneSize = 5.6;

  const h1H = h1Size * 1.15;
  const h2H = h2Size * 1.15;
  const nameH = nameSize * 1.25;
  const tagH = tagSize * 1.15;
  const slogH = slogSize * 1.15;
  const phoneH = phoneSize * 1.15;

  const totalContentH = h1H + h2H + nameH + tagH + slogH + phoneH;
  const availBannerH = bannerH - 13.5 - 2.2;
  const extraGap = Math.max(0.6, (availBannerH - totalContentH) / 5);

  const mainColor = '#091431';

  // Line 1
  doc.font('HindiBold').fontSize(h1Size).fillColor(mainColor).text('ग्राम पंचायत नाथडियास', textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
  curY += h1H + extraGap;

  // Line 2
  doc.font('HindiBold').fontSize(h2Size).fillColor(mainColor).text('रायपुर पंचायत समिति वार्ड 11 पद हेतु', textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
  curY += h2H + extraGap;

  // Line 3: Candidate Name
  doc.font('HindiBold').fontSize(nameSize).fillColor(mainColor).text('संदीप कुमार त्रिवेदी', textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
  curY += nameH + extraGap + 0.4;

  // Line 4: Tagline
  doc.font('HindiBold').fontSize(tagSize).fillColor(mainColor).text('"मु आपको आप मारा वोट दिजो हाथ पे सारा"', textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
  curY += tagH + extraGap;

  // Line 5: Slogan
  doc.font('HindiBold').fontSize(slogSize).fillColor(mainColor).text('को अपना अमूल्य मत देकर भारी मतों से विजयी बनावें।', textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
  curY += slogH + extraGap;

  // Line 6: Mobile
  const safePhoneY = Math.min(curY, y + bannerH - phoneH - 1.8);
  doc.font('HindiBold').fontSize(phoneSize).fillColor(mainColor).text('मो. 9214553153', textLeft, safePhoneY, { width: textWidth, align: 'center', lineBreak: false });

  // Scissor Divider Line
  const dividerY = y + bannerH + 1.2;
  doc.save();
  doc.strokeColor('#94a3b8').lineWidth(0.6).dash(3, { space: 2 });
  doc.moveTo(x + 3, dividerY).lineTo(x + cardWidth - 3, dividerY).stroke();
  doc.undash();

  // Scissor Badge with vector scissors
  const badgeW = 125;
  const badgeH = 7.5;
  const badgeX = x + (cardWidth - badgeW) / 2;
  const badgeY = dividerY - 3.75;
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2).fillColor('#ffffff').fill();

  // Draw clean vector scissors
  const sCX = badgeX + 8;
  const sCY = badgeY + badgeH / 2;
  doc.lineWidth(0.5).strokeColor('#475569');
  doc.moveTo(sCX - 2.5, sCY - 1.8).lineTo(sCX + 3.0, sCY + 1.8).stroke();
  doc.moveTo(sCX - 2.5, sCY + 1.8).lineTo(sCX + 3.0, sCY - 1.8).stroke();
  doc.circle(sCX - 3.2, sCY - 2.0, 1.0).stroke();
  doc.circle(sCX - 3.2, sCY + 2.0, 1.0).stroke();

  doc.fillColor('#1e293b').font('Hindi').fontSize(4.5).text('मतदान तिथि से पूर्व बांटी गयी पर्ची, ऊपर का हिस्सा फाड़ दें', badgeX + 12, badgeY + 1.4, { width: badgeW - 14, align: 'center' });
  doc.restore();

  // Voter section
  const lowerY = dividerY + 4.0;
  // Serial pill
  doc.roundedRect(x + 4, lowerY, 28, 12, 2.5).lineWidth(0.8).strokeColor('#15803d').fillColor('#f0fdf4').fillAndStroke();
  doc.font('HindiBold').fontSize(7.5).fillColor('#15803d').text('1', x + 4, lowerY + 1.5, { width: 28, align: 'center' });

  // EPIC pill
  doc.roundedRect(x + 34, lowerY, 26, 12, 2.5).fillColor('#15803d').fill();
  doc.font('HindiBold').fontSize(6.0).fillColor('#ffffff').text('EPIC', x + 34, lowerY + 2.8, { width: 26, align: 'center' });

  // EPIC number box
  doc.roundedRect(x + 60, lowerY, 78, 12, 2.5).lineWidth(0.8).strokeColor('#0f172a').fillColor('#f8fafc').fillAndStroke();
  doc.font('HindiBold').fontSize(6.5).fillColor('#0f172a').text('RJ/20/152/124002', x + 62, lowerY + 2.2, { width: 74, align: 'center' });

  // Details
  const detLeft = x + 4;
  let dY = lowerY + 15.0;
  const fL = 6.2;
  const fV = 7.2;
  const lH = 10.2;

  function drawField(lbl, val) {
    doc.font('Hindi').fontSize(fL).fillColor('#1e293b').text(lbl + ' : ', detLeft, dY, { continued: true });
    doc.font('HindiBold').fontSize(fV).fillColor('#000000').text(val);
    dY += lH;
  }
  drawField('नाम', 'सोसर');
  drawField('पति का नाम', 'जगदीश');
  drawField('मकान संख्या', '1');

  // Age / Gender
  doc.font('Hindi').fontSize(fL).fillColor('#1e293b').text('आयु : ', detLeft, dY, { continued: true });
  doc.font('HindiBold').fontSize(fV).fillColor('#000000').text('67    ', { continued: true });
  doc.font('Hindi').fontSize(fL).fillColor('#1e293b').text('लिंग : ', { continued: true });
  doc.font('HindiBold').fontSize(fV).fillColor('#000000').text('महिला');
  dY += lH;
  drawField('गाँव', 'नाथडियास');

  // Voter Photo Box
  const photoBoxW = 44;
  const photoBoxH = 55;
  const photoBoxX = x + 142;
  const photoBoxY = lowerY;
  doc.roundedRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH, 3).lineWidth(0.8).strokeColor('#3b82f6').fillColor('#ffffff').fillAndStroke();
  doc.font('Hindi').fontSize(6.5).fillColor('#94a3b8').text('वोटर\nफोटो', photoBoxX, photoBoxY + 18, { width: photoBoxW, align: 'center' });

  // Ward / Polling Station Box
  const wardBoxX = x + 190;
  const wardBoxY = lowerY;
  const wardBoxW = cardWidth - (wardBoxX - x) - 4;
  const wardBoxH = photoBoxH;
  doc.roundedRect(wardBoxX, wardBoxY, wardBoxW, wardBoxH, 3).fillColor('#0f2942').fill();
  doc.font('Hindi').fontSize(6.2).fillColor('#e2e8f0').text('वार्ड नंबर', wardBoxX, wardBoxY + 4, { width: wardBoxW, align: 'center' });
  doc.font('HindiBold').fontSize(16).fillColor('#ffffff').text('1', wardBoxX, wardBoxY + 12, { width: wardBoxW, align: 'center' });
  doc.strokeColor('#475569').lineWidth(0.5).moveTo(wardBoxX + 6, wardBoxY + 31).lineTo(wardBoxX + wardBoxW - 6, wardBoxY + 31).stroke();
  doc.font('Hindi').fontSize(5.0).fillColor('#94a3b8').text('मतदान केंद्र', wardBoxX, wardBoxY + 33, { width: wardBoxW, align: 'center' });
  doc.font('HindiBold').fontSize(5.5).fillColor('#ffffff').text('रा.उ.मा.वि.,\nनाथडियास', wardBoxX + 2, wardBoxY + 40, { width: wardBoxW - 4, align: 'center' });

  // Footer bar
  const footerH = 11.5;
  const footerY = y + cardHeight - footerH - 2.5;
  doc.roundedRect(x + 2.5, footerY, cardWidth - 5, footerH, 2).fillColor('#0a192f').fill();
  doc.font('HindiBold').fontSize(5.8).fillColor('#ffffff').text('मतदान समय : प्रातः 7 से सायं 6 बजे तक', x + 4, footerY + 2.2, { width: cardWidth - 20, align: 'center' });
  doc.font('HindiBold').fontSize(5.8).fillColor('#ffffff').text('1', x + cardWidth - 16, footerY + 2.2, { width: 10, align: 'right' });

  doc.end();
  await new Promise(r => stream.on('finish', r));
  console.log('PDF rendered successfully');
}

testTirangaDesign();
