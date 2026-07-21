const Log = require('../models/Log');

// GET /api/logs
exports.getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, level = '', event = '', sessionId = '' } = req.query;
    const query = { userId: req.user._id };
    if (level) query.level = level;
    if (event) query.event = { $regex: event, $options: 'i' };
    if (sessionId) query.sessionId = sessionId;

    const total = await Log.countDocuments(query);
    const logs = await Log.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
