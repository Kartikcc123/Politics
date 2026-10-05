const PDFDocument = require('pdfkit');
const fs = require('fs');

function testPageCount() {
  const doc = new PDFDocument({ size: 'A4', margin: 28, bufferPages: true });
  const out = fs.createWriteStream('test_pages_count.pdf');
  doc.pipe(out);

  const margin = 28;
  const usableWidth = doc.page.width - margin * 2;

  // Add 3 pages of content
  doc.text('Page 1 Content');
  doc.addPage();
  doc.text('Page 2 Content');
  doc.addPage();
  doc.text('Page 3 Content');

  const pages = doc.bufferedPageRange();
  console.log('Initial page count before numbering:', pages.count);

  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(pages.start + i);
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor('#667394')
      .text(`Page ${i + 1} of ${pages.count}`, margin, doc.page.height - 20, {
        width: usableWidth,
        align: 'center',
        lineBreak: false
      });
    doc.page.margins.bottom = oldBottom;
  }

  const finalPages = doc.bufferedPageRange();
  console.log('Final page count after numbering:', finalPages.count);

  doc.end();
  out.on('finish', () => {
    console.log('Finished! Final pages:', finalPages.count);
  });
}
testPageCount();
