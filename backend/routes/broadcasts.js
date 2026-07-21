const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Broadcast = require('../models/Broadcast');
const Contact = require('../models/Contact');
const Log = require('../models/Log');
const BroadcastQueue = require('../services/broadcast/BroadcastQueue');
const SessionManager = require('../services/whatsapp/SessionManager');
const Session = require('../models/Session');


// GET /api/broadcasts
router.get('/', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Broadcast.countDocuments({ userId: req.user._id });
    const broadcasts = await Broadcast.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-recipients');

    res.json({ success: true, broadcasts, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/broadcasts/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const broadcast = await Broadcast.findOne({ _id: req.params.id, userId: req.user._id });
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, broadcast });
  } catch (err) {
    next(err);
  }
});

// POST /api/broadcasts — Create and start broadcast
router.post('/', protect, upload.single('media'), async (req, res, next) => {
  try {
    const { title, message, recipientType, tag, phones, minDelay, maxDelay, useRoundRobin } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message required' });
    }

    // Require at least one connected session in DB (ready check happens in queue)
    const connectedCount = await Session.countDocuments({ userId: req.user._id, status: 'connected' });
    if (!connectedCount) {
      return res.status(400).json({
        success: false,
        message: 'No connected WhatsApp session. Connect a session first, then try again.',
      });
    }

    if (SessionManager.isMock()) {
      console.warn('⚠️ Broadcast started while Baileys is in MOCK MODE — messages will NOT reach real WhatsApp');
    }

    // Build recipients list
    let contacts = [];
    if (recipientType === 'all') {
      contacts = await Contact.find({ userId: req.user._id, isOptedOut: false }).lean();
    } else if (recipientType === 'tag' && tag) {
      contacts = await Contact.find({ userId: req.user._id, tags: tag, isOptedOut: false }).lean();
    } else if (recipientType === 'custom' && phones) {
      const phoneList = phones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
      contacts = phoneList.map((phone) => ({ phone, name: '' }));
    }

    if (!contacts.length) {
      return res.status(400).json({ success: false, message: 'No recipients found' });
    }

    const recipients = contacts
      .map((c) => {
        const normalized = SessionManager.normalizePhone(c.phone);
        return {
          contactId: c._id || null,
          phone: normalized || String(c.phone || '').trim(),
          name: c.name || '',
          status: 'pending',
        };
      })
      .filter((r) => r.phone && r.phone.length >= 8);

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid phone numbers. Use international format with country code (e.g. 919876543210).',
      });
    }

    let mediaUrl = null;
    let mediaType = null;

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      const ext = req.file.mimetype.split('/')[0];
      mediaType = ['image', 'video'].includes(ext) ? ext : 'document';
    } else if (req.body.mediaUrl) {
      mediaUrl = req.body.mediaUrl;
      mediaType = 'image'; // assume image for URL
    }

    const broadcast = await Broadcast.create({
      userId: req.user._id,
      title,
      message,
      mediaUrl,
      mediaType,
      recipients,
      total: recipients.length,
      minDelay: parseInt(minDelay) || 5000,
      maxDelay: parseInt(maxDelay) || 15000,
      useRoundRobin: useRoundRobin !== 'false',
      status: 'pending',
    });

    await Log.create({
      userId: req.user._id,
      event: 'BROADCAST_STARTED',
      level: 'info',
      broadcastId: broadcast._id,
      details: `Broadcast "${title}" started with ${recipients.length} recipients`,
    });

    // Start async — don't await!
    BroadcastQueue.runBroadcast(broadcast._id);

    res.status(201).json({ success: true, broadcast: { ...broadcast.toObject(), recipients: undefined } });
  } catch (err) {
    next(err);
  }
});

// POST /api/broadcasts/:id/stop
router.post('/:id/stop', protect, async (req, res, next) => {
  try {
    const broadcast = await Broadcast.findOne({ _id: req.params.id, userId: req.user._id });
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });

    const stopped = BroadcastQueue.stopBroadcast(req.params.id);
    res.json({ success: true, stopped, message: stopped ? 'Stop requested' : 'Broadcast not running' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/broadcasts/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const broadcast = await Broadcast.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
