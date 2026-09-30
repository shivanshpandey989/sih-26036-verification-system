/* eslint-disable no-console */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateQrToken } = require('../src/utils/qr');
const { generateCertificatePdf } = require('../src/utils/pdf');
const { evaluateObservation, computeOverallResult, DEFAULT_PARAMETERS } = require('../src/utils/tolerance');

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@1234';

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const instrumentTypes = [
  { type: 'Electronic Weighing Scale', capacity: '100 kg', accuracy: 'Class III' },
  { type: 'Platform Scale', capacity: '500 kg', accuracy: 'Class III' },
  { type: 'Petrol Dispensing Unit', capacity: '50 L/min', accuracy: 'Class 0.5' },
  { type: 'Compact Weighing Scale', capacity: '30 kg', accuracy: 'Class II' },
  { type: 'Water Meter', capacity: '15 mm', accuracy: 'Class B' },
  { type: 'Taximeter', capacity: 'N/A', accuracy: 'Class 1' },
  { type: 'Beam Scale', capacity: '1000 kg', accuracy: 'Class III' },
  { type: 'Length Measure (Tape)', capacity: '30 m', accuracy: 'Class II' },
];

async function main() {
  console.log('Seeding database...');

  // Wipe existing data (idempotent seed) — order matters due to FKs.
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Anita Sharma',
      email: 'admin@demo.com',
      phone: '9800000001',
      passwordHash,
      role: 'ADMIN',
      organisation: 'Directorate of Legal Metrology',
    },
  });

  const lmo = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'lmo@demo.com',
      phone: '9800000002',
      passwordHash,
      role: 'LMO',
      organisation: 'Legal Metrology Office, Pune',
    },
  });

  const gatc = await prisma.user.create({
    data: {
      name: 'Priya Deshmukh',
      email: 'gatc@demo.com',
      phone: '9800000003',
      passwordHash,
      role: 'GATC',
      organisation: 'Shivneri Govt. Approved Test Centre',
    },
  });

  const businessUser = await prisma.user.create({
    data: {
      name: 'Suresh Patil',
      email: 'business@demo.com',
      phone: '9800000004',
      passwordHash,
      role: 'BUSINESS',
      organisation: 'Patil General Stores',
    },
  });

  const businessNames = [
    ['Patil General Stores', 'Suresh Patil', businessUser.id],
    ['Om Sai Petroleum', 'Vikas Joshi', null],
    ['Shree Balaji Traders', 'Meena Rao', null],
    ['National Dairy Supplies', 'Arjun Nair', null],
    ['City Gold Weighbridge Co.', 'Farhan Sheikh', null],
  ];

  const businesses = [];
  for (const [businessName, ownerName, userId] of businessNames) {
    const business = await prisma.business.create({
      data: {
        businessName,
        ownerName,
        address: `${Math.floor(Math.random() * 200) + 1}, Market Road, Pune, Maharashtra`,
        phone: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        email: `${businessName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
        userId: userId || undefined,
      },
    });
    businesses.push(business);
  }

  // Create 10 instruments distributed across businesses.
  const instruments = [];
  for (let i = 0; i < 10; i += 1) {
    const t = instrumentTypes[i % instrumentTypes.length];
    const business = businesses[i % businesses.length];
    const instrument = await prisma.instrument.create({
      data: {
        instrumentNumber: `INS-${2026}-${String(1000 + i)}`,
        instrumentType: t.type,
        manufacturer: ['Avery Weigh-Tronix', 'Essae Digitronics', 'Mettler Toledo', 'Contech', 'Vishal Scales'][i % 5],
        model: `MDL-${100 + i}`,
        serialNumber: `SN${900000 + i}`,
        capacity: t.capacity,
        accuracyClass: t.accuracy,
        location: 'Shop No. ' + (i + 1) + ', Market Yard, Pune',
        businessId: business.id,
        currentStatus: 'PENDING_VERIFICATION',
      },
    });
    instruments.push(instrument);
  }

  // Create 15 verifications with a mix of outcomes across instruments.
  const outcomes = [
    'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS',
    'FAIL', 'FAIL',
    'PENDING', 'PENDING',
    'PASS', 'PASS', 'PASS', 'FAIL', 'PASS',
  ];

  let verNum = 100001;
  let appNum = 50001;
  let certNum = 700001;

  for (let i = 0; i < 15; i += 1) {
    const instrument = instruments[i % instruments.length];
    const officer = i % 2 === 0 ? lmo : gatc;
    const outcome = outcomes[i];
    const daysAgo = Math.floor(Math.random() * 300);
    const startedAt = new Date();
    startedAt.setDate(startedAt.getDate() - daysAgo);

    const verification = await prisma.verification.create({
      data: {
        instrumentId: instrument.id,
        officerId: officer.id,
        verificationNumber: `VER-2026-${verNum++}`,
        applicationNumber: `APP-2026-${appNum++}`,
        verificationType: i % 4 === 0 ? 'INITIAL' : 'RE_VERIFICATION',
        status: outcome === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED',
        startedAt,
        completedAt: outcome === 'PENDING' ? null : startedAt,
        result: outcome,
        remarks: outcome === 'FAIL' ? 'One or more parameters outside permissible tolerance.' : 'All parameters within tolerance.',
      },
    });

    // Observations
    for (const [paramIndex, p] of DEFAULT_PARAMETERS.entries()) {
      let value;
      if (outcome === 'PENDING') {
        value = null;
      } else if (outcome === 'FAIL' && p.parameter === 'Accuracy') {
        value = '0.35'; // deliberately out of tolerance
      } else {
        value = (Math.random() * 0.04).toFixed(3);
      }
      const status = value === null ? 'PENDING' : evaluateObservation({
        parameter: p.parameter,
        observationValue: value,
        expectedValue: p.expectedValue,
      });
      await prisma.observation.create({
        data: {
          verificationId: verification.id,
          parameter: p.parameter,
          unit: p.unit,
          expectedValue: p.expectedValue,
          observationValue: value,
          status,
          sortOrder: paramIndex,
          remarks: outcome === 'FAIL' && p.parameter === 'Accuracy' ? 'Exceeds permissible tolerance.' : null,
          enteredAt: value === null ? null : startedAt,
        },
      });
    }

    if (outcome === 'PASS') {
      const validUntil = new Date(startedAt);
      validUntil.setMonth(validUntil.getMonth() + 12);

      const certificate = await prisma.certificate.create({
        data: {
          certificateNumber: `LM-2026-${certNum++}`,
          verificationId: verification.id,
          issueDate: startedAt,
          validUntil,
          status: validUntil < new Date() ? 'EXPIRED' : 'VALID',
          qrToken: generateQrToken(),
        },
      });

      let instrumentStatus = 'VALID';
      if (validUntil < new Date()) instrumentStatus = 'EXPIRED';
      else if (validUntil < daysFromNow(30)) instrumentStatus = 'EXPIRING_SOON';

      await prisma.instrument.update({
        where: { id: instrument.id },
        data: { currentStatus: instrumentStatus, nextVerificationDate: validUntil },
      });

      // Generate a real PDF + QR for the first few PASS certificates so the
      // demo has working "Download PDF" / "Scan QR" buttons out of the box.
      if (i < 5) {
        const full = await prisma.verification.findUnique({
          where: { id: verification.id },
          include: { instrument: { include: { business: true } }, officer: true },
        });
        try {
          const pdfPath = await generateCertificatePdf({
            certificate,
            verification: full,
            instrument: full.instrument,
            business: full.instrument.business,
            officer: full.officer,
          });
          await prisma.certificate.update({ where: { id: certificate.id }, data: { pdfPath } });
        } catch (e) {
          console.warn('PDF generation skipped for seed record:', e.message);
        }
      }
    } else if (outcome === 'FAIL') {
      await prisma.instrument.update({ where: { id: instrument.id }, data: { currentStatus: 'FAILED' } });
    }

    await prisma.auditLog.create({
      data: {
        userId: officer.id,
        action: outcome === 'PENDING' ? 'VERIFICATION_STARTED' : 'VERIFICATION_COMPLETED',
        entityType: 'Verification',
        entityId: verification.id,
        metadata: { result: outcome },
      },
    });
  }

  await prisma.auditLog.create({
    data: { userId: admin.id, action: 'ADMIN_SEED_RUN', entityType: 'System', entityId: null, metadata: { note: 'Demo data seeded' } },
  });

  console.log('Seed complete.');
  console.log('---------------------------------------------');
  console.log('Demo accounts (password for all):', DEMO_PASSWORD);
  console.log('Admin:    admin@demo.com');
  console.log('LMO:      lmo@demo.com');
  console.log('GATC:     gatc@demo.com');
  console.log('Business: business@demo.com');
  console.log('---------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
