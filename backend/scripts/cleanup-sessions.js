/**
 * Script to clean up stale mock sessions from the database
 * Run: node scripts/cleanup-sessions.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Session = require('../models/Session');
    const sessionsDir = path.join(__dirname, '../sessions');

    // Find all sessions marked as connected/pending/qr_ready
    const staleSessions = await Session.find({ 
      status: { $in: ['connected', 'pending', 'qr_ready'] } 
    });

    console.log(`Found ${staleSessions.length} sessions to check...`);

    for (const s of staleSessions) {
      const authDir = path.join(sessionsDir, s.sessionId);
      const hasAuthCreds = fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0;

      if (!hasAuthCreds) {
        console.log(`  🗑️  Marking stale session "${s.label}" (${s.sessionId}) as disconnected`);
        await Session.findOneAndUpdate(
          { sessionId: s.sessionId },
          { status: 'disconnected', qrCode: null }
        );
      } else {
        console.log(`  ✅ Session "${s.label}" has auth credentials, keeping it`);
      }
    }

    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err);
    process.exit(1);
  }
}

cleanup();