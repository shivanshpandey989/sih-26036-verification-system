const QRCode = require('qrcode');
const { randomBytes } = require('crypto');

function generateQrToken() {
  // URL-safe, unguessable token. Not a database primary key, so it can
  // safely be embedded in a public QR code without exposing internal IDs.
  return randomBytes(16).toString('hex');
}

function buildVerificationUrl(qrToken) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base}/verify/${qrToken}`;
}

async function generateQrPngBuffer(qrToken) {
  const url = buildVerificationUrl(qrToken);
  return QRCode.toBuffer(url, { type: 'png', width: 300, margin: 1 });
}

async function generateQrDataUrl(qrToken) {
  const url = buildVerificationUrl(qrToken);
  return QRCode.toDataURL(url, { width: 300, margin: 1 });
}

module.exports = { generateQrToken, buildVerificationUrl, generateQrPngBuffer, generateQrDataUrl };
