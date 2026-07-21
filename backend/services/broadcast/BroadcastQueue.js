const Broadcast = require('../../models/Broadcast');
const Session = require('../../models/Session');
const Contact = require('../../models/Contact');
const Log = require('../../models/Log');
const SessionManager = require('../whatsapp/SessionManager');
const { getIO } = require('../socket/socketService');

// Active broadcast jobs: broadcastId → { running, stopRequested }
const activeJobs = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = (min, max) => {
  const lo = Math.max(0, Number(min) || 0);
  const hi = Math.max(lo, Number(max) || lo);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
};

/**
 * Get sessions that are BOTH marked connected in DB AND ready in memory.
 */
const getReadySessions = async (userId) => {
  const dbSessions = await Session.find({ userId, status: 'connected' }).lean();
  return dbSessions.filter((s) => SessionManager.isSessionReady(s.sessionId));
};

const runBroadcast = async (broadcastId) => {
  let broadcast;
  try {
    broadcast = await Broadcast.findById(broadcastId);
    if (!broadcast) {
      console.error(`Broadcast ${broadcastId} not found`);
      return;
    }

    // Prevent double-run
    if (activeJobs.has(broadcastId.toString())) {
      console.warn(`Broadcast ${broadcastId} already running`);
      return;
    }

    const io = getIO();
    const userId = broadcast.userId.toString();

    console.log(`📣 Starting broadcast ${broadcastId} for user ${userId}`);
    console.log(`   Recipients: ${broadcast.recipients.length}, Mock mode: ${SessionManager.isMock()}`);

    // Wait for sessions to become ready (up to 45 seconds)
    let activeSessions = await getReadySessions(broadcast.userId);
    if (!activeSessions.length) {
      console.log(`⏳ Broadcast ${broadcastId}: Waiting for ready sessions...`);
      for (let attempt = 0; attempt < 45; attempt++) {
        await sleep(1000);
        activeSessions = await getReadySessions(broadcast.userId);
        if (activeSessions.length) {
          console.log(
            `✅ Broadcast ${broadcastId}: Found ${activeSessions.length} ready session(s) after ${attempt + 1}s`
          );
          break;
        }
      }
    }

    if (!activeSessions.length) {
      // Extra diagnostics
      const dbConnected = await Session.find({ userId: broadcast.userId, status: 'connected' });
      const memActive = SessionManager.getActiveSessions();
      console.error(
        `❌ No ready sessions. DB connected=${dbConnected.length}, memory ready=${memActive.length}, mock=${SessionManager.isMock()}`
      );

      broadcast.status = 'failed';
      await broadcast.save();
      await Log.create({
        userId: broadcast.userId,
        event: 'BROADCAST_FAILED',
        level: 'error',
        broadcastId: broadcast._id,
        details: `No active WhatsApp sessions ready to send. DB connected: ${dbConnected.length}, memory ready: ${memActive.length}`,
      });
      io.to(`user:${userId}`).emit('broadcast:error', {
        broadcastId,
        message: 'No active WhatsApp sessions. Please connect a session and wait until it shows Connected.',
      });
      return;
    }

    console.log(
      `📡 Using sessions: ${activeSessions.map((s) => s.sessionId).join(', ')}`
    );

    broadcast.status = 'running';
    broadcast.startedAt = new Date();
    await broadcast.save();

    activeJobs.set(broadcastId.toString(), { running: true, stopRequested: false });

    let sessionIndex = 0;

    for (let i = 0; i < broadcast.recipients.length; i++) {
      const job = activeJobs.get(broadcastId.toString());
      if (!job || job.stopRequested) {
        broadcast.status = 'stopped';
        broadcast.completedAt = new Date();
        await broadcast.save();
        io.to(`user:${userId}`).emit('broadcast:stopped', { broadcastId });
        console.log(`⏹ Broadcast ${broadcastId} stopped by user`);
        break;
      }

      const recipient = broadcast.recipients[i];
      if (recipient.status !== 'pending') continue;

      // Refresh ready sessions every 10 messages
      if (i % 10 === 0) {
        activeSessions = await getReadySessions(broadcast.userId);
        if (!activeSessions.length) {
          console.error(`❌ Lost all sessions mid-broadcast at recipient ${i}`);
          broadcast.status = 'failed';
          await broadcast.save();
          io.to(`user:${userId}`).emit('broadcast:error', {
            broadcastId,
            message: 'All WhatsApp sessions disconnected during broadcast',
          });
          break;
        }
      }

      const session = activeSessions[sessionIndex % activeSessions.length];
      sessionIndex++;

      const phone = recipient.phone;
      console.log(
        `📨 [${i + 1}/${broadcast.recipients.length}] → ${phone} via ${session.sessionId}`
      );

      try {
        const result = await SessionManager.sendMessage(
          session.sessionId,
          phone,
          broadcast.message,
          broadcast.mediaUrl,
          broadcast.mediaType
        );

        broadcast.recipients[i].status = 'sent';
        broadcast.recipients[i].sentAt = new Date();
        broadcast.recipients[i].sessionId = session.sessionId;
        broadcast.recipients[i].error = undefined;
        broadcast.sent += 1;

        await Contact.findOneAndUpdate(
          { userId: broadcast.userId, phone: recipient.phone },
          { lastMessage: broadcast.message, lastMessageAt: new Date() }
        );

        await Session.findOneAndUpdate(
          { sessionId: session.sessionId },
          { $inc: { messagesSent: 1 }, lastSeen: new Date() }
        );

        await Log.create({
          userId: broadcast.userId,
          event: 'MESSAGE_SENT',
          level: 'success',
          sessionId: session.sessionId,
          broadcastId: broadcast._id,
          phone: recipient.phone,
          details: `Sent to ${recipient.phone} via ${session.sessionId} id=${result?.key?.id || 'n/a'}`,
        });
      } catch (err) {
        const errMsg = err?.message || String(err);
        console.error(`❌ Failed → ${phone}: ${errMsg}`);

        broadcast.recipients[i].status = 'failed';
        broadcast.recipients[i].error = errMsg;
        broadcast.failed += 1;

        await Session.findOneAndUpdate(
          { sessionId: session.sessionId },
          { $inc: { messagesFailed: 1 } }
        );

        await Log.create({
          userId: broadcast.userId,
          event: 'MESSAGE_FAILED',
          level: 'error',
          sessionId: session.sessionId,
          broadcastId: broadcast._id,
          phone: recipient.phone,
          details: errMsg,
        });

        // If session died, drop it from rotation immediately
        if (
          /not active|not ready|no authenticated|reconnect/i.test(errMsg)
        ) {
          activeSessions = activeSessions.filter((s) => s.sessionId !== session.sessionId);
          if (!activeSessions.length) {
            // try refresh once
            activeSessions = await getReadySessions(broadcast.userId);
          }
        }
      }

      // Emit real-time progress
      io.to(`user:${userId}`).emit('broadcast:progress', {
        broadcastId,
        sent: broadcast.sent,
        failed: broadcast.failed,
        total: broadcast.total,
        current: i + 1,
        contact: { phone: recipient.phone, name: recipient.name },
        status: broadcast.recipients[i].status,
        error: broadcast.recipients[i].error || null,
      });

      // Save progress every message so UI/detail view stays accurate
      if ((i + 1) % 3 === 0 || i === broadcast.recipients.length - 1) {
        await broadcast.save();
      }

      // Delay between messages (anti-ban)
      if (i < broadcast.recipients.length - 1) {
        const delay = randomDelay(broadcast.minDelay, broadcast.maxDelay);
        await sleep(delay);
      }
    }

    // Final save
    const job = activeJobs.get(broadcastId.toString());
    if (job && !job.stopRequested && broadcast.status === 'running') {
      broadcast.status = 'completed';
      broadcast.completedAt = new Date();
    }
    await broadcast.save();
    activeJobs.delete(broadcastId.toString());

    io.to(`user:${userId}`).emit('broadcast:done', {
      broadcastId,
      sent: broadcast.sent,
      failed: broadcast.failed,
      total: broadcast.total,
      status: broadcast.status,
    });

    await Log.create({
      userId: broadcast.userId,
      event: 'BROADCAST_COMPLETED',
      level: broadcast.failed > 0 && broadcast.sent === 0 ? 'error' : 'success',
      broadcastId: broadcast._id,
      details: `Status: ${broadcast.status}, Sent: ${broadcast.sent}, Failed: ${broadcast.failed}`,
    });

    console.log(
      `🏁 Broadcast ${broadcastId} ${broadcast.status}: sent=${broadcast.sent} failed=${broadcast.failed}`
    );
  } catch (err) {
    console.error('Broadcast queue error:', err);
    if (broadcast) {
      broadcast.status = 'failed';
      await broadcast.save().catch(() => {});
      try {
        const io = getIO();
        io.to(`user:${broadcast.userId.toString()}`).emit('broadcast:error', {
          broadcastId,
          message: err.message,
        });
      } catch {}
    }
    activeJobs.delete(String(broadcastId));
  }
};

const stopBroadcast = (broadcastId) => {
  const job = activeJobs.get(broadcastId.toString());
  if (job) {
    job.stopRequested = true;
    return true;
  }
  return false;
};

const isRunning = (broadcastId) => activeJobs.has(broadcastId.toString());

module.exports = { runBroadcast, stopBroadcast, isRunning };
