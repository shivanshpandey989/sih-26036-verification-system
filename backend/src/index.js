require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const { scheduleExpiryCheck } = require('./jobs/expiryCheck');

const authRoutes = require('./routes/auth');
const instrumentRoutes = require('./routes/instruments');
const verificationRoutes = require('./routes/verifications');
const observationRoutes = require('./routes/observations');
const certificateRoutes = require('./routes/certificates');
const verifyRoutes = require('./routes/verify');
const dashboardRoutes = require('./routes/dashboard');
const auditLogRoutes = require('./routes/auditLogs');
const userRoutes = require('./routes/users');
const businessRoutes = require('./routes/businesses');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'OVS API is running.' }));

app.use('/api/auth', authRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/verify', verifyRoutes); // public, no auth — must be mounted before the generic '/api' router below
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/businesses', businessRoutes);
// Mounted last and deliberately at the generic '/api' prefix (it internally
// serves both /api/verifications/:id/observations and /api/observations/:id).
// It MUST come after every other /api/* router above, because it applies
// `router.use(authenticate)` unconditionally to anything under '/api' that
// reaches it — mounting it earlier would silently force auth onto routes
// that are supposed to be public (like /api/verify) or onto routes handled
// by a later, more specific router.
app.use('/api', observationRoutes);

app.use('/storage', express.static(path.join(__dirname, '..', 'storage')));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`OVS backend listening on http://localhost:${PORT}`);
  scheduleExpiryCheck();
});

module.exports = app;
