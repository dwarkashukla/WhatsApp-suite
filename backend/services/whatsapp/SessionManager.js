const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const Session = require('../../models/Session');
const Log = require('../../models/Log');
const { getIO } = require('../socket/socketService');

// Create silent logger for Baileys (set to 'warn' temporarily for debugging send issues)
const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' });

// Try importing Baileys, catch if it is missing (due to Git not installed)
let makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore;
let useMock = false;

try {
  const baileys = require('@whiskeysockets/baileys');
  makeWASocket = baileys.default;
  DisconnectReason = baileys.DisconnectReason;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
  console.log('✅ Baileys WhatsApp Engine loaded successfully');
} catch (err) {
  console.warn('⚠️ Baileys package not found. Running in WhatsApp MOCK MODE.');
  console.warn('   Reason:', err.message);
  useMock = true;
}

// sessionId → { sock, userId, ready, phone }
const sessions = new Map();
const sessionsDir = path.join(__dirname, '../../sessions');
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

const logEvent = async (userId, sessionId, event, level, details) => {
  try {
    await Log.create({ userId, sessionId, event, level, details });
  } catch {}
};

/**
 * Normalize a phone number to digits-only international format.
 * Strips +, spaces, dashes. Leaves country code as-is if present.
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).trim();

  // Already a JID
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@')[0].split(':')[0];
  }

  // Keep digits only
  cleaned = cleaned.replace(/\D/g, '');

  // Remove leading zeros (common when users type 09876...)
  cleaned = cleaned.replace(/^0+/, '');

  return cleaned;
};

/**
 * Resolve local media path from relative /uploads/... URL or absolute path.
 */
const resolveMediaPath = (mediaUrl) => {
  if (!mediaUrl) return null;

  // Absolute filesystem path
  if (path.isAbsolute(mediaUrl) && fs.existsSync(mediaUrl)) {
    return mediaUrl;
  }

  // /uploads/filename or uploads/filename
  const filename = mediaUrl.replace(/^\/?uploads\//, '');
  const localPath = path.join(uploadsDir, filename);
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // Remote http(s) URL — Baileys can fetch these
  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl;
  }

  return null;
};

// ─── Mock WhatsApp Session Flow ──────────────────────────────
const startMockSession = async (sessionId, userId) => {
  if (sessions.has(sessionId)) return;

  console.log(`🔌 Starting Mock WhatsApp session for ID: ${sessionId}`);
  const io = getIO();

  sessions.set(sessionId, { sock: { mock: true }, userId, ready: false, phone: null });

  try {
    const qrDataUrl = await QRCode.toDataURL(`https://github.com/whiskeysockets/baileys?session=${sessionId}`);
    await Session.findOneAndUpdate({ sessionId }, { status: 'qr_ready', qrCode: qrDataUrl });
    io.to(`user:${userId}`).emit('qr', { sessionId, qrDataUrl });
    await logEvent(userId, sessionId, 'QR_GENERATED', 'info', 'Mock QR code generated (Auto-scans in 5s)');

    setTimeout(async () => {
      if (!sessions.has(sessionId)) return;

      const randomPhone = `9198${Math.floor(10000000 + Math.random() * 90000000)}`;
      const entry = sessions.get(sessionId);
      if (entry) {
        entry.ready = true;
        entry.phone = randomPhone;
      }

      await Session.findOneAndUpdate(
        { sessionId },
        { status: 'connected', phone: randomPhone, qrCode: null, lastSeen: new Date() }
      );
      io.to(`user:${userId}`).emit('session:connected', { sessionId, phone: randomPhone });
      await logEvent(userId, sessionId, 'SESSION_CONNECTED', 'success', `Connected (Mock): ${randomPhone}`);
      console.log(`✅ Mock Session connected: ${sessionId} (${randomPhone})`);
    }, 5000);
  } catch (err) {
    console.error('Mock QR generation error:', err);
  }
};

// ─── Real Baileys Session Flow ───────────────────────────────
const startRealSession = async (sessionId, userId) => {
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    // If already ready, nothing to do
    if (existing?.ready) return existing.sock;
    // If socket exists but not ready, don't spawn a second one
    if (existing?.sock && !existing.sock.mock) return existing.sock;
  }

  const authDir = path.join(sessionsDir, sessionId);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  let version;
  try {
    const versionInfo = await fetchLatestBaileysVersion();
    version = versionInfo.version;
    console.log(`📦 Using WA version: ${version.join('.')}`);
  } catch (err) {
    console.warn('⚠️ Could not fetch latest WA version, using default:', err.message);
    version = undefined;
  }

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    browser: ['WhatsApp Suite', 'Chrome', '120.0.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
    getMessage: async () => undefined,
  });

  sessions.set(sessionId, { sock, userId, ready: false, phone: null });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const io = getIO();
    const entry = sessions.get(sessionId);

    if (qr) {
      try {
        if (entry) entry.ready = false;
        const qrDataUrl = await QRCode.toDataURL(qr);
        await Session.findOneAndUpdate({ sessionId }, { status: 'qr_ready', qrCode: qrDataUrl });
        io.to(`user:${userId}`).emit('qr', { sessionId, qrDataUrl });
        await logEvent(userId, sessionId, 'QR_GENERATED', 'info', 'QR code generated');
        console.log(`📱 QR generated for session: ${sessionId}`);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    }

    if (connection === 'connecting') {
      console.log(`🔄 Session connecting: ${sessionId}`);
      if (entry) entry.ready = false;
    }

    if (connection === 'open') {
      const phone = sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0] || null;

      if (entry) {
        entry.ready = true;
        entry.phone = phone;
      }

      await Session.findOneAndUpdate(
        { sessionId },
        { status: 'connected', phone, qrCode: null, lastSeen: new Date() }
      );
      io.to(`user:${userId}`).emit('session:connected', { sessionId, phone });
      await logEvent(userId, sessionId, 'SESSION_CONNECTED', 'success', `Connected: ${phone}`);
      console.log(`✅ Session connected & READY: ${sessionId} (${phone})`);
    }

    if (connection === 'close') {
      if (entry) entry.ready = false;

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMsg = lastDisconnect?.error?.message || 'unknown';
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut &&
        statusCode !== 401 &&
        statusCode !== DisconnectReason.connectionReplaced;

      console.log(`❌ Session closed: ${sessionId} | code=${statusCode} | ${errorMsg} | reconnect=${shouldReconnect}`);

      sessions.delete(sessionId);

      if (shouldReconnect) {
        await Session.findOneAndUpdate({ sessionId }, { status: 'pending', qrCode: null });
        await logEvent(userId, sessionId, 'SESSION_RECONNECTING', 'warn', `Reason: ${statusCode} ${errorMsg}`);
        setTimeout(() => {
          startSession(sessionId, userId).catch((e) =>
            console.error(`Reconnect failed for ${sessionId}:`, e.message)
          );
        }, 5000);
      } else {
        await Session.findOneAndUpdate({ sessionId }, { status: 'disconnected', qrCode: null });
        if (fs.existsSync(authDir)) {
          try {
            fs.rmSync(authDir, { recursive: true, force: true });
          } catch {}
        }
        io.to(`user:${userId}`).emit('session:disconnected', { sessionId });
        await logEvent(userId, sessionId, 'SESSION_LOGGED_OUT', 'warn', `Logged out: ${statusCode}`);
      }
    }
  });

  // Catch stream errors so they don't crash the process silently
  sock.ev.on('messaging-history.set', () => {
    // ignore history dump
  });

  return sock;
};

// ─── Router method: starts appropriate driver ────────────────
const startSession = async (sessionId, userId) => {
  if (useMock) {
    return await startMockSession(sessionId, userId);
  }
  return await startRealSession(sessionId, userId);
};

const stopSession = async (sessionId) => {
  const entry = sessions.get(sessionId);
  if (entry) {
    if (!useMock && entry.sock && !entry.sock.mock) {
      try {
        entry.sock.ev.removeAllListeners();
        await entry.sock.logout();
      } catch {
        try {
          entry.sock.end?.(undefined);
        } catch {}
      }
    }
    sessions.delete(sessionId);
  }

  await Session.findOneAndUpdate(
    { sessionId },
    { status: 'disconnected', qrCode: null }
  ).catch(() => {});
};

/** Raw map entry (may not be ready) */
const getSession = (sessionId) => {
  const entry = sessions.get(sessionId);
  return entry?.sock || null;
};

/** True only when socket exists AND connection is open */
const isSessionReady = (sessionId) => {
  const entry = sessions.get(sessionId);
  if (!entry) return false;
  if (useMock || entry.sock?.mock) return !!entry.ready;
  return !!entry.ready && !!entry.sock?.user;
};

const getActiveSessions = () =>
  Array.from(sessions.entries())
    .filter(([, entry]) => entry.ready)
    .map(([id, entry]) => ({ sessionId: id, sock: entry.sock, phone: entry.phone }));

/**
 * Resolve WhatsApp JID for a phone number using onWhatsApp.
 * Returns { jid, exists } or throws if number is invalid / not on WhatsApp.
 */
const resolveJid = async (sock, phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 8) {
    throw new Error(`Invalid phone number: "${phone}" (normalized: "${normalized}")`);
  }

  // Prefer onWhatsApp so we get the canonical JID WhatsApp expects
  if (typeof sock.onWhatsApp === 'function') {
    try {
      const results = await sock.onWhatsApp(normalized);
      const match = Array.isArray(results) ? results.find((r) => r?.exists) : null;
      if (match?.jid) {
        return { jid: match.jid, exists: true, normalized };
      }
      // Explicitly not registered
      throw new Error(`Number ${normalized} is not registered on WhatsApp`);
    } catch (err) {
      // If onWhatsApp itself failed (network), fall back to constructed JID
      if (err.message?.includes('not registered')) throw err;
      console.warn(`⚠️ onWhatsApp failed for ${normalized}, falling back to constructed JID:`, err.message);
    }
  }

  return { jid: `${normalized}@s.whatsapp.net`, exists: null, normalized };
};

/**
 * Send a text or media message via an active session.
 */
const sendMessage = async (sessionId, phone, message, mediaUrl = null, mediaType = null) => {
  const entry = sessions.get(sessionId);
  if (!entry) {
    throw new Error(`Session ${sessionId} not active in memory`);
  }

  if (!entry.ready) {
    throw new Error(`Session ${sessionId} is not ready (still connecting)`);
  }

  const sock = entry.sock;
  if (!sock) throw new Error(`Session ${sessionId} socket missing`);

  // ── Mock path ──
  if (useMock || sock.mock) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (Math.random() < 0.08) {
      throw new Error('Connection timeout (Mock failure simulation)');
    }
    console.log(`📤 [MOCK] Sent to ${phone}: ${(message || '').slice(0, 40)}`);
    return { mockSuccess: true, key: { id: `mock_${Date.now()}` } };
  }

  // Must have authenticated user
  if (!sock.user) {
    throw new Error(`Session ${sessionId} has no authenticated user — reconnect required`);
  }

  const { jid, normalized } = await resolveJid(sock, phone);
  console.log(`📤 Sending to ${normalized} → ${jid} via session ${sessionId}`);

  let result;

  if (mediaUrl && mediaType) {
    const resolved = resolveMediaPath(mediaUrl);
    if (!resolved) {
      throw new Error(`Media file not found: ${mediaUrl}`);
    }

    const isRemote = /^https?:\/\//i.test(resolved);
    const mediaPayload = isRemote ? { url: resolved } : { url: resolved };

    // For local files Baileys accepts { url: absolutePath }
    // Also support reading buffer for reliability on Windows
    let content;
    if (!isRemote && fs.existsSync(resolved)) {
      const buffer = fs.readFileSync(resolved);
      if (mediaType === 'image') {
        content = { image: buffer, caption: message || undefined };
      } else if (mediaType === 'video') {
        content = { video: buffer, caption: message || undefined };
      } else {
        content = {
          document: buffer,
          mimetype: 'application/octet-stream',
          fileName: path.basename(resolved),
          caption: message || undefined,
        };
      }
    } else {
      content =
        {
          image: { ...mediaPayload, caption: message || undefined },
          video: { ...mediaPayload, caption: message || undefined },
          document: {
            ...mediaPayload,
            mimetype: 'application/octet-stream',
            fileName: 'file',
            caption: message || undefined,
          },
        }[mediaType] || { text: message };
    }

    result = await sock.sendMessage(jid, content);
  } else {
    if (!message || !String(message).trim()) {
      throw new Error('Message text is empty');
    }
    result = await sock.sendMessage(jid, { text: String(message) });
  }

  if (!result || !result.key) {
    throw new Error(`sendMessage returned empty result for ${jid}`);
  }

  console.log(`✅ Message sent to ${jid} | id=${result.key.id}`);
  return result;
};

// Restore sessions from DB on server start
const restoreAllSessions = async () => {
  try {
    const activeSessions = await Session.find({
      status: { $in: ['connected', 'pending', 'qr_ready'] },
    });

    if (activeSessions.length === 0) {
      console.log('📱 No sessions to restore');
      return;
    }

    console.log(`📱 Restoring ${activeSessions.length} sessions...`);
    for (const s of activeSessions) {
      const authDir = path.join(sessionsDir, s.sessionId);
      const hasAuthCreds =
        fs.existsSync(authDir) &&
        fs.existsSync(path.join(authDir, 'creds.json'));

      if (!useMock && !hasAuthCreds) {
        console.log(`  ⚠️ Session ${s.sessionId} has no creds.json — marking disconnected`);
        await Session.findOneAndUpdate(
          { sessionId: s.sessionId },
          { status: 'disconnected', qrCode: null }
        );
      } else {
        console.log(`  🔁 Restoring ${s.sessionId}...`);
        try {
          await startSession(s.sessionId, s.userId.toString());
        } catch (err) {
          console.error(`  ❌ Failed to restore ${s.sessionId}:`, err.message);
          await Session.findOneAndUpdate(
            { sessionId: s.sessionId },
            { status: 'disconnected', qrCode: null }
          );
        }
      }
    }
  } catch (err) {
    console.error('Session restore error:', err);
  }
};

module.exports = {
  startSession,
  stopSession,
  getSession,
  getActiveSessions,
  isSessionReady,
  sendMessage,
  restoreAllSessions,
  normalizePhone,
  isMock: () => useMock,
};
