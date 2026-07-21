const Contact = require('../models/Contact');
const Session = require('../models/Session');
const Broadcast = require('../models/Broadcast');
const Log = require('../models/Log');

// GET /api/stats
exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalContacts, activeSessions, broadcasts, recentBroadcasts, recentLogs] = await Promise.all([
      Contact.countDocuments({ userId }),
      Session.countDocuments({ userId, status: 'connected' }),
      Broadcast.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalSent: { $sum: '$sent' },
            totalFailed: { $sum: '$failed' },
            todaySent: {
              $sum: {
                $cond: [{ $gte: ['$startedAt', today] }, '$sent', 0],
              },
            },
          },
        },
      ]),
      Broadcast.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Log.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const stats = broadcasts[0] || { totalSent: 0, totalFailed: 0, todaySent: 0 };

    res.json({
      success: true,
      stats: {
        totalContacts,
        activeSessions,
        totalSent: stats.totalSent,
        totalFailed: stats.totalFailed,
        todaySent: stats.todaySent,
      },
      recentBroadcasts,
      recentLogs,
    });
  } catch (err) {
    next(err);
  }
};
