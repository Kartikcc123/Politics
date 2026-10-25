const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function runVerification() {
  const doc = new PDFDocument({ size: 'A4', margin: 15, bufferPages: true });
  const regularFont = path.join(__dirname, '../src/assets/fonts/Nirmala.ttf');
  const boldFont = path.join(__dirname, '../src/assets/fonts/Nirmala-Bold.ttf');
  doc.registerFont('Hindi', regularFont).registerFont('HindiBold', boldFont).font('Hindi');

  const outPdf = path.join(__dirname, '../verify_10_fix.pdf');
  const stream = fs.createWriteStream(outPdf);
  doc.pipe(stream);

  const params = {
    layout: 'campaign',
    campaignSlip: 'true',
    votersPerPage: '10',
    candidateName: 'संदीप कुमार त्रिवेदी',
    candidatePost: 'रायपुर पंचायत समिति वार्ड 11 पद हेतु',
    candidateTagline: 'मु आपको आप मारा वोट दिजो हाथ पे सारा',
    candidatePhone: '9214553153',
    candidateSlogan: 'को अपना अमूल्य मत देकर भारी मतों से विजयी बनावें।',
    pollingTime: 'मतदान समय : प्रातः 7 से सायं 6 बजे तक',
    colorTheme: 'saffron_crimson',
    textScale: '1.0'
  };

  const columns = 2;
  const rowsPerPage = 5;
  const margin = 15;
  const gapX = 9;
  const gapY = 8;
  const topY = margin;
  const bottomY = doc.page.height - margin;
  const usableWidth = doc.page.width - margin * 2;
  const usableHeight = bottomY - topY;
  const cardWidth = (usableWidth - gapX * (columns - 1)) / columns;
  const cardHeight = (usableHeight - gapY * (rowsPerPage - 1)) / rowsPerPage;
  const textScale = 1.0;

  const candPhotoPath = path.join(__dirname, '../uploads/candidate_sandeep_clean.png');
  const leaderPhotoPath = path.join(__dirname, '../uploads/leader_senior_clean.png');
  const candImgBuf = fs.existsSync(candPhotoPath) ? fs.readFileSync(candPhotoPath) : null;
  const leaderImgBuf = fs.existsSync(leaderPhotoPath) ? fs.readFileSync(leaderPhotoPath) : null;
  const candidatePhotoImageObj = candImgBuf ? doc.openImage(candImgBuf) : null;
  const leaderPhotoImageObj = leaderImgBuf ? doc.openImage(leaderImgBuf) : null;

  let votingFingerImageObj = null;
  try {
    const vPath = path.join(__dirname, '../src/assets/voting_finger_emblem.png');
    if (fs.existsSync(vPath)) votingFingerImageObj = doc.openImage(fs.readFileSync(vPath));
  } catch (_) {}

  let defaultPartySymbolImageObj = null;
  try {
    const pPath = path.join(__dirname, '../src/assets/default_party_symbol.png');
    if (fs.existsSync(pPath)) defaultPartySymbolImageObj = doc.openImage(fs.readFileSync(pPath));
  } catch (_) {}
  const effectiveSymbolImageObj = defaultPartySymbolImageObj;
  const bannerImageObj = null;

  function drawVectorScissors(doc, cx, cy, size = 3.0) {
    doc.save();
    doc.lineWidth(0.6).strokeColor('#475569');
    doc.circle(cx, cy, 0.4).fillColor('#475569').fill();
    doc.moveTo(cx - size * 0.8, cy - size * 0.6).lineTo(cx + size * 1.2, cy + size * 0.6).stroke();
    doc.moveTo(cx - size * 0.8, cy + size * 0.6).lineTo(cx + size * 1.2, cy - size * 0.6).stroke();
    doc.circle(cx - size * 0.8 - 0.9, cy - size * 0.6 - 0.7, 1.2).stroke();
    doc.circle(cx - size * 0.8 - 0.9, cy + size * 0.6 + 0.7, 1.2).stroke();
    doc.restore();
  }

  const theme = {
    bannerBg: '#ffffff',
    cardBorder: '#0e8742',
    cardInnerBorder: '#f37021',
    photoRing: '#d4af37',
    photoRing2: '#f59e0b',
    photoRing3: '#b45309',
    headerL1: '#091431',
    headerL2: '#091431',
    candName: '#091431',
    tagline: '#091431',
    slogan: '#091431',
    phone: '#091431',
    serialBorder: '#16a34a',
    serialBg: '#f0fdf4',
    serialText: '#15803d',
    wardBoxBg: '#0f2942',
    wardBoxText: '#ffffff',
    wardDivider: '#475569',
    footerBg: '#0a192f',
    footerText: '#ffffff',
  };

  const members = [
    { voterSerial: 1, name: 'सोसर', guardianName: 'जगदीश', houseNumber: '1', age: 67, gender: 'female', village: 'नाथडियास', wardNumber: '1', voterId: 'RJ/20/152/124002' },
    { voterSerial: 2, name: 'भंवरलाल', guardianName: 'बदरीलाल', houseNumber: '1', age: 63, gender: 'male', village: 'नाथडियास', wardNumber: '1', voterId: 'RJ/20/152/123601' },
    { voterSerial: 3, name: 'नन्दा', guardianName: 'प्यारा', houseNumber: '105', age: 74, gender: 'male', village: 'नाथडियास', wardNumber: '5', voterId: 'RJ/20/152/123239' },
    { voterSerial: 4, name: 'सायरी', guardianName: 'नन्दा', houseNumber: '105', age: 72, gender: 'female', village: 'नाथडियास', wardNumber: '5', voterId: 'RJ/20/152/123341' },
  ];

  for (let i = 0; i < 10; i++) {
    const m = members[i % members.length];
    const r = Math.floor(i / columns);
    const c = i % columns;
    const x = margin + c * (cardWidth + gapX);
    const y = topY + r * (cardHeight + gapY);

    const gpName = m.village || 'नाथडियास';
    const postName = params.candidatePost || '';
    let candName = (params.candidateName || '').trim();
    const candTagline = (params.candidateTagline || '').trim();
    const candPhone = (params.candidatePhone || '').trim();
    const candSlogan = (params.candidateSlogan || '').trim();

    const hasCampaignDetails = true;

    let bannerLineCount = 0;
    if (gpName && postName) bannerLineCount += 2;
    else if (gpName || postName) bannerLineCount += 1;
    if (candName || hasCampaignDetails) bannerLineCount += 1;
    if (candTagline) bannerLineCount += 1;
    if (candSlogan) bannerLineCount += 1;
    if (candPhone) bannerLineCount += 1;

    const bannerFraction = bannerLineCount >= 5 ? 0.40 : (bannerLineCount >= 4 ? 0.36 : 0.33);
    const bannerH = Math.max(50, Math.min(76, Math.round(cardHeight * bannerFraction)));
    const isCompactCard = cardHeight < 170;
    const photoR = Math.max(16, Math.min(23, Math.round((bannerH - 12) / 2)));
    const photoCY = y + 2 + (bannerH - 2) / 2;

    // 0. Double Tiranga Luxury Border
    doc.roundedRect(x, y, cardWidth, cardHeight, 4.5).lineWidth(1.2).strokeColor('#0e8742').stroke();
    doc.roundedRect(x + 1.8, y + 1.8, cardWidth - 3.6, cardHeight - 3.6, 3.0).lineWidth(0.9).strokeColor('#f37021').stroke();

    if (votingFingerImageObj) {
      const iconW = isCompactCard ? 34 : 40;
      const iconH = isCompactCard ? 17 : 20;
      const iconX = x + cardWidth / 2 - iconW / 2;
      const iconY = y - (isCompactCard ? 4.5 : 5.0);
      doc.rect(x + cardWidth / 2 - 5, y - 1.5, 10, 4.0).fillColor('#ffffff').fill();
      doc.image(votingFingerImageObj, iconX, iconY, { width: iconW, height: iconH });
    }

    // 1. TOP BANNER
    doc.roundedRect(x + 2, y + 2, cardWidth - 4, bannerH - 2, 2).fillColor(theme.bannerBg).fill();

    // Candidate Photo
    const leftCX = x + 8 + photoR;
    if (candidatePhotoImageObj) {
      doc.save();
      doc.circle(leftCX, photoCY, photoR).clip();
      doc.image(candidatePhotoImageObj, leftCX - photoR, photoCY - photoR, {
        width: photoR * 2,
        height: photoR * 2,
        fit: [photoR * 2, photoR * 2],
        align: 'center',
        valign: 'center',
      });
      doc.restore();

      doc.circle(leftCX, photoCY, photoR + 1.6).lineWidth(1.8).strokeColor(theme.photoRing).stroke();
      doc.circle(leftCX, photoCY, photoR + 2.6).lineWidth(0.7).strokeColor(theme.photoRing2).stroke();
      doc.circle(leftCX, photoCY, photoR).lineWidth(0.5).strokeColor(theme.photoRing3).stroke();
    }

    // Leader Photo
    const rightCX = x + cardWidth - 8 - photoR;
    if (leaderPhotoImageObj) {
      doc.save();
      doc.circle(rightCX, photoCY, photoR).clip();
      doc.image(leaderPhotoImageObj, rightCX - photoR, photoCY - photoR, {
        width: photoR * 2,
        height: photoR * 2,
        fit: [photoR * 2, photoR * 2],
        align: 'center',
        valign: 'center',
      });
      doc.restore();

      doc.circle(rightCX, photoCY, photoR + 1.6).lineWidth(1.8).strokeColor(theme.photoRing).stroke();
      doc.circle(rightCX, photoCY, photoR + 2.6).lineWidth(0.7).strokeColor(theme.photoRing2).stroke();
      doc.circle(rightCX, photoCY, photoR).lineWidth(0.5).strokeColor(theme.photoRing3).stroke();
    }

    // Party Symbol
    if (effectiveSymbolImageObj) {
      const symbolR = Math.max(9.5, Math.min(13.5, Math.round(photoR * 0.60)));
      const symbolCX = leaderPhotoImageObj ? (rightCX - photoR - symbolR - 3.5) : rightCX;
      const symbolCY = leaderPhotoImageObj ? (y + 4.0 + symbolR) : photoCY;
      try {
        doc.save();
        doc.circle(symbolCX, symbolCY, symbolR).fillColor('#ffffff').fill();
        doc.circle(symbolCX, symbolCY, symbolR).clip();
        doc.image(effectiveSymbolImageObj, symbolCX - symbolR, symbolCY - symbolR, {
          width: symbolR * 2,
          height: symbolR * 2,
          fit: [symbolR * 2, symbolR * 2],
          align: 'center',
          valign: 'center',
        });
        doc.restore();
        doc.circle(symbolCX, symbolCY, symbolR).lineWidth(0.6).strokeColor('#0e8742').stroke();
      } catch (_) {}
    }

    // Center Typography (Auto-Balanced)
    const textLeft = candidatePhotoImageObj ? (leftCX + photoR + 3) : (x + 8);
    const textRight = leaderPhotoImageObj ? (rightCX - photoR - 3) : (x + cardWidth - 8);
    const textWidth = Math.max(70, textRight - textLeft);

    const h1Size = isCompactCard ? 6.2 : 7.6;
    const h2Size = isCompactCard ? 5.8 : 7.2;
    const nameSize = isCompactCard ? 10.5 : 13.0;
    const tagSize = isCompactCard ? 5.0 : 6.5;
    const slogSize = isCompactCard ? 5.0 : 6.8;
    const phoneSize = isCompactCard ? 5.6 : 7.0;

    const h1H = h1Size * 1.15;
    const h2H = h2Size * 1.15;
    const nameH = nameSize * 1.25;
    const tagH = tagSize * 1.15;
    const slogH = slogSize * 1.15;
    const phoneH = phoneSize * 1.15;

    let totalContentH = 0;
    if (gpName) totalContentH += h1H;
    if (postName) totalContentH += h2H;
    if (candName) totalContentH += nameH;
    if (candTagline) totalContentH += tagH;
    if (candSlogan) totalContentH += slogH;
    if (candPhone) totalContentH += phoneH;

    const startTextY = votingFingerImageObj ? (y + (isCompactCard ? 13.2 : 14.5)) : (y + 2.2);
    const availBannerH = bannerH - (startTextY - y) - 2.2;
    const extraGap = Math.max(0.6, Math.min(3.2, (availBannerH - totalContentH) / Math.max(1, bannerLineCount - 1)));

    let curY = startTextY;
    const mainTextColor = '#091431';

    // Line 1: GP
    if (gpName) {
      const line1 = `ग्राम पंचायत ${gpName}`;
      let s1 = h1Size * textScale;
      doc.font('HindiBold').fontSize(s1);
      while (s1 > 4.6 && doc.widthOfString(line1) > textWidth) { s1 -= 0.3; doc.fontSize(s1); }
      doc.fillColor(mainTextColor).text(line1, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
      curY += h1H + extraGap;
    }

    // Line 2: Post
    if (postName) {
      const line2 = `${postName}`;
      let s2 = h2Size * textScale;
      doc.font('HindiBold').fontSize(s2);
      while (s2 > 4.6 && doc.widthOfString(line2) > textWidth) { s2 -= 0.3; doc.fontSize(s2); }
      doc.fillColor(mainTextColor).text(line2, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
      curY += h2H + extraGap;
    }

    // Line 3: Name
    if (candName) {
      let sN = nameSize * textScale;
      doc.font('HindiBold').fontSize(sN);
      while (sN > 7.0 && doc.widthOfString(candName) > textWidth) { sN -= 0.4; doc.fontSize(sN); }
      doc.fillColor(mainTextColor).text(candName, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
      curY += nameH + extraGap + 0.4;
    }

    // Line 4: Tagline
    if (candTagline) {
      const tagFull = `"${candTagline}"`;
      let sT = tagSize * textScale;
      doc.font('HindiBold').fontSize(sT);
      while (sT > 4.2 && doc.widthOfString(tagFull) > textWidth) { sT -= 0.3; doc.fontSize(sT); }
      doc.fillColor(mainTextColor).text(tagFull, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
      curY += tagH + extraGap;
    }

    // Line 5: Slogan
    if (candSlogan) {
      const sloganText = candSlogan || 'को अपना अमूल्य मत देकर भारी मतों से विजयी बनावें।';
      let sS = slogSize * textScale;
      doc.font('HindiBold').fontSize(sS);
      while (sS > 4.2 && doc.widthOfString(sloganText) > textWidth) { sS -= 0.3; doc.fontSize(sS); }
      doc.fillColor(mainTextColor).text(sloganText, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
      curY += slogH + extraGap;
    }

    // Line 6: Mobile
    if (candPhone) {
      const phoneText = `मो. ${candPhone}`;
      let sP = phoneSize * textScale;
      doc.font('HindiBold').fontSize(sP);
      while (sP > 4.5 && doc.widthOfString(phoneText) > textWidth) { sP -= 0.3; doc.fontSize(sP); }
      const safePhoneY = Math.min(curY, y + bannerH - phoneH - 1.8);
      doc.fillColor(mainTextColor).text(phoneText, textLeft, safePhoneY, { width: textWidth, align: 'center', lineBreak: false });
    }


    // 2. TEAR-OFF SCISSOR LINE
    const dividerY = y + bannerH + 1.2;
    doc.save();
    doc.dash(2.5, { space: 2.0 }).moveTo(x + 4, dividerY).lineTo(x + cardWidth - 4, dividerY).lineWidth(0.5).strokeColor('#64748b').stroke();
    doc.restore();

    const tearOffText = 'मतदान तिथि से पूर्व बांटी गयी पर्ची, ऊपर का हिस्सा फाड़ दें';
    const tearSize = isCompactCard ? 4.8 : 5.4;
    doc.font('HindiBold').fontSize(tearSize);
    const textW = doc.widthOfString(tearOffText);
    const scissorIconW = 12;
    const totalPillW = textW + scissorIconW + 10;
    const pillX = x + (cardWidth - totalPillW) / 2;

    doc.rect(pillX, dividerY - 3.2, totalPillW, 6.4).fillColor('#ffffff').fill();
    drawVectorScissors(doc, pillX + 5, dividerY, isCompactCard ? 2.6 : 3.0);
    doc.fillColor('#475569').text(tearOffText, pillX + scissorIconW + 2, dividerY - (isCompactCard ? 2.6 : 3.0), { width: textW + 4, align: 'left', lineBreak: false });

    // 3. VOTER DATA AREA
    const footerH = Math.max(12, Math.min(16, Math.round(cardHeight * 0.08)));
    const footerY = y + cardHeight - footerH;
    const contentY = dividerY + (isCompactCard ? 4.0 : 5.5);

    const col1W = 138;
    const col2W = isCompactCard ? 46 : 52;
    const col3W = cardWidth - col1W - col2W - 10;
    const col1X = x + 4;
    const col2X = col1X + col1W + 2;
    const col3X = col2X + col2W + 2;

    const pillH = isCompactCard ? 13 : 15;

    // Serial
    doc.roundedRect(col1X, contentY, 30, pillH, 2.5).lineWidth(0.8).strokeColor(theme.serialBorder).fillColor(theme.serialBg).fillAndStroke();
    doc.font('HindiBold').fontSize(Math.max(7.5, (isCompactCard ? 9.5 : 11.0) * textScale)).fillColor(theme.serialText).text(String(m.voterSerial), col1X, contentY + (isCompactCard ? 1.5 : 2.0), { width: 30, align: 'center' });

    // EPIC
    const displayEpic = m.voterId;
    const epicW = col1W - 34;
    const epicBadgeW = isCompactCard ? 24 : 28;
    const epicNumW = epicW - epicBadgeW;
    const epicBoxX = col1X + 34;

    doc.roundedRect(epicBoxX, contentY, epicBadgeW, pillH, 2).fillColor('#15803d').fill();
    doc.font('HindiBold').fontSize(isCompactCard ? 6.8 : 7.5).fillColor('#ffffff').text('EPIC', epicBoxX, contentY + (isCompactCard ? 2.5 : 3.0), { width: epicBadgeW, align: 'center', lineBreak: false });

    doc.roundedRect(epicBoxX + epicBadgeW, contentY, epicNumW, pillH, 2).lineWidth(0.8).strokeColor('#334155').fillColor('#f8fafc').fillAndStroke();
    let epicFontSize = Math.max(6.5, (isCompactCard ? 8.0 : 9.0) * textScale);
    doc.font('HindiBold').fontSize(epicFontSize).fillColor('#0f172a').text(displayEpic, epicBoxX + epicBadgeW, contentY + (pillH - epicFontSize) / 2, { width: epicNumW, align: 'center', lineBreak: false });

    // 5 Lines: Name, Guardian, House, Age/Gender, Village
    const lineCount = 5;
    const voterStartY = contentY + pillH + (isCompactCard ? 2.5 : 3.5);
    const availVoterH = footerY - 2.0 - voterStartY;
    const lineGap = availVoterH / lineCount;
    let voterLineY = voterStartY;

    const lblSize = Math.max(5.5, Math.min(9.2, lineGap * 0.58 * textScale));
    const valSize = Math.max(6.0, Math.min(10.5, lineGap * 0.68 * textScale));

    // L1: Name
    doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('नाम : ', col1X, voterLineY, { continued: true });
    doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(m.name, { lineBreak: false });
    voterLineY += lineGap;

    // L2: Guardian
    const relationLabel = m.gender === 'female' ? 'पति का नाम' : 'पिता का नाम';
    doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text(`${relationLabel} : `, col1X, voterLineY, { continued: true });
    doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(m.guardianName, { lineBreak: false });
    voterLineY += lineGap;

    // L3: House
    doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('मकान संख्या : ', col1X, voterLineY, { continued: true });
    doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(m.houseNumber, { lineBreak: false });
    voterLineY += lineGap;

    // L4: Age/Gender
    const gender = m.gender === 'male' ? 'पुरुष' : 'महिला';
    doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('आयु : ', col1X, voterLineY, { continued: true });
    doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(`${m.age}      `, { continued: true });
    doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('लिंग : ', { continued: true });
    doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(gender, { lineBreak: false });
    voterLineY += lineGap;

    // L5: Village
    doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('गाँव : ', col1X, voterLineY, { continued: true });
    doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(m.village, { lineBreak: false });

    // Col 2: Voter Photo Box
    const photoBoxH = footerY - contentY - 3;
    doc.roundedRect(col2X, contentY, col2W, photoBoxH, 2.5).lineWidth(0.7).strokeColor('#64748b').stroke();
    doc.font('HindiBold').fontSize(isCompactCard ? 6.0 : 7.0).fillColor('#94a3b8').text('वोटर\nफोटो', col2X, contentY + photoBoxH / 2 - 8, { width: col2W, align: 'center' });

    // Col 3: Ward Box
    const wardBoxH = footerY - contentY - 2.5;
    doc.roundedRect(col3X, contentY, col3W, wardBoxH, 3.5).fillColor(theme.wardBoxBg).fill();

    doc.font('HindiBold').fontSize(Math.max(6.0, (isCompactCard ? 7.2 : 8.5) * textScale)).fillColor(theme.wardBoxText).text('वार्ड नंबर', col3X, contentY + wardBoxH * 0.05, { width: col3W, align: 'center', lineBreak: false });
    doc.font('HindiBold').fontSize(Math.max(12.0, (isCompactCard ? 16.0 : 22.0) * textScale)).fillColor(theme.wardBoxText).text(String(m.wardNumber), col3X, contentY + wardBoxH * 0.16, { width: col3W, align: 'center', lineBreak: false });

    doc.moveTo(col3X + 5, contentY + wardBoxH * 0.44).lineTo(col3X + col3W - 5, contentY + wardBoxH * 0.44).lineWidth(0.8).strokeColor(theme.wardDivider).stroke();

    doc.font('HindiBold').fontSize(Math.max(5.2, (isCompactCard ? 6.2 : 7.5) * textScale)).fillColor(theme.wardDivider).text('मतदान केंद्र', col3X, contentY + wardBoxH * 0.48, { width: col3W, align: 'center', lineBreak: false });
    doc.font('HindiBold').fontSize(Math.max(4.8, (isCompactCard ? 6.5 : 7.8) * textScale)).fillColor(theme.wardBoxText).text('रा.उ.मा.वि.,\n' + m.village, col3X + 1, contentY + wardBoxH * 0.62, { width: col3W - 2, align: 'center', height: wardBoxH * 0.35 });

    // 4. FOOTER
    doc.rect(x + 1.8, footerY, cardWidth - 3.6, footerH).fillColor(theme.footerBg).fill();
    doc.font('HindiBold').fontSize(Math.max(6.2, (isCompactCard ? 7.0 : 8.2) * textScale)).fillColor(theme.footerText).text(params.pollingTime, x, footerY + (isCompactCard ? 2.2 : 2.8), { width: cardWidth, align: 'center' });
    doc.font('Hindi').fontSize(Math.max(5.5, (isCompactCard ? 6.5 : 7.5) * textScale)).fillColor(theme.footerText).text(String(i + 1), x, footerY + (isCompactCard ? 2.4 : 3.0), { width: cardWidth - 6, align: 'right' });
  }

  doc.end();
  console.log('Verification PDF generated successfully at:', outPdf);
}

runVerification();
