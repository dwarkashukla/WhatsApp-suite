const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Log = require('../models/Log');
const SessionManager = require('../services/whatsapp/SessionManager');

// GET /api/sessions
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions — create new session & trigger QR
exports.createSession = async (req, res, next) => {
  try {
    const { label } = req.body;
    const sessionId = uuidv4();

    const session = await Session.create({
      userId: req.user._id,
      sessionId,
      label: label || `Account ${Date.now()}`,
      status: 'pending',
    });

    // Start Baileys for this session (async — QR will come via socket)
    SessionManager.startSession(sessionId, req.user._id.toString());

    await Log.create({
      userId: req.user._id,
      event: 'SESSION_CREATED',
      level: 'info',
      sessionId,
      details: `New session created: ${label}`,
    });

    res.status(201).json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sessions/:id
exports.deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Stop the Baileys instance
    await SessionManager.stopSession(session.sessionId);
    await session.deleteOne();

    await Log.create({
      userId: req.user._id,
      event: 'SESSION_DELETED',
      level: 'warn',
      sessionId: session.sessionId,
      details: `Session removed: ${session.label}`,
    });

    res.json({ success: true, message: 'Session removed' });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:id/reconnect
exports.reconnectSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    await SessionManager.stopSession(session.sessionId);
    session.status = 'pending';
    session.qrCode = null;
    await session.save();

    SessionManager.startSession(session.sessionId, req.user._id.toString());

    res.json({ success: true, message: 'Reconnecting...' });
  } catch (err) {
    next(err);
  }
};
