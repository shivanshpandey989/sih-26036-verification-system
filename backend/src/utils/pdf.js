const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { generateQrPngBuffer, buildVerificationUrl } = require('./qr');

const CERT_DIR = path.join(__dirname, '..', '..', 'storage', 'certificates');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Generates the certificate PDF to disk and returns the relative path
 * (stored on the Certificate row as pdfPath).
 */
async function generateCertificatePdf({ certificate, verification, instrument, business, officer }) {
  const fileName = `${certificate.certificateNumber}.pdf`;
  const filePath = path.join(CERT_DIR, fileName);
  const qrPng = await generateQrPngBuffer(certificate.qrToken);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fillColor('#10345C').fontSize(10).font('Helvetica-Bold')
    .text('GOVERNMENT OF INDIA', { align: 'center' });
  doc.fontSize(16).text('DEPARTMENT OF LEGAL METROLOGY', { align: 'center' });
  doc.fontSize(10).font('Helvetica').fillColor('#444')
    .text('Online Verification System for Weighing & Measuring Instruments', { align: 'center' });
  doc.moveDown(0.6);
  doc.strokeColor('#10345C').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  doc.fillColor('#10345C').fontSize(14).font('Helvetica-Bold')
    .text('CERTIFICATE OF VERIFICATION', { align: 'center' });
  const resultLabel = verification.result === 'PASS' ? 'VERIFIED & PASSED' : 'FAILED';
  doc.fontSize(11).fillColor(verification.result === 'PASS' ? '#0F7B3F' : '#B3261E')
    .text(resultLabel, { align: 'center' });
  doc.moveDown(1);

  doc.fillColor('#000').fontSize(10).font('Helvetica');

  const row = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text(label, 50, doc.y, { continued: true, width: 200 });
    doc.font('Helvetica').fillColor('#000').text(`  ${value ?? '-'}`);
  };

  row('Certificate Number:', certificate.certificateNumber);
  row('Application Number:', verification.applicationNumber);
  row('Verification Number:', verification.verificationNumber);
  row('Verification Type:', verification.verificationType);
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#10345C').text('Instrument Details');
  doc.moveDown(0.2);
  row('Instrument ID:', instrument.instrumentNumber);
  row('Instrument Type:', instrument.instrumentType);
  row('Manufacturer:', instrument.manufacturer);
  row('Model:', instrument.model);
  row('Serial Number:', instrument.serialNumber);
  row('Capacity:', instrument.capacity);
  row('Accuracy Class:', instrument.accuracyClass);
  row('Location:', instrument.location);
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#10345C').text('Owner / Business Details');
  doc.moveDown(0.2);
  row('Business Name:', business.businessName);
  row('Owner Name:', business.ownerName);
  row('Address:', business.address);
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#10345C').text('Verification Details');
  doc.moveDown(0.2);
  row('Verification Date:', fmtDate(verification.completedAt || verification.startedAt));
  row('Valid Until:', fmtDate(certificate.validUntil));
  row('Verifying Officer:', `${officer.name} (${officer.role})`);
  row('Remarks:', verification.remarks || 'None');
  doc.moveDown(1);

  // QR + verification URL
  const qrY = doc.y;
  doc.image(qrPng, 50, qrY, { width: 100 });
  doc.font('Helvetica').fontSize(9).fillColor('#444')
    .text('Scan to verify this certificate online, or visit:', 165, qrY + 5, { width: 350 });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#10345C')
    .text(buildVerificationUrl(certificate.qrToken), 165, doc.y, { width: 380 });

  doc.moveDown(6);
  doc.font('Helvetica').fontSize(8).fillColor('#666')
    .text(`Digitally generated on ${new Date().toLocaleString('en-IN')} by the Online Verification System.`, 50, doc.y, { align: 'left' });
  doc.text('This is a system-generated certificate and does not require a physical signature.', { align: 'left' });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return path.relative(path.join(__dirname, '..', '..'), filePath);
}

module.exports = { generateCertificatePdf, CERT_DIR };
