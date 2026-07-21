require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const socketService = require('./services/socket/socketService');
const SessionManager = require('./services/whatsapp/SessionManager');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const contactRoutes = require('./routes/contacts');
const templateRoutes = require('./routes/templates');
const broadcastRoutes = require('./routes/broadcasts');
const logRoutes = require('./routes/logs');
const statsRoutes = require('./routes/stats');

const app = express();
const server = http.createServer(app);

// ─── Init Socket.io ────────────────────────────────────────────
socketService.init(server);

// ─── Middleware ────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// ─── Routes ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ success: true, message: 'WhatsApp Suite API running ✅', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/stats', statsRoutes);

// Static files (uploaded media)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// 404
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`\n🚀 WhatsApp Suite Backend running on port ${PORT}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🌐 CORS allowed: ${process.env.CLIENT_URL}`);
  });

  // Restore all previously connected WhatsApp sessions
  setTimeout(() => SessionManager.restoreAllSessions(), 2000);
};

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
