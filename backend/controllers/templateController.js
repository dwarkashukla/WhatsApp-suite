const Template = require('../models/Template');

// GET /api/templates
exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await Template.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, templates });
  } catch (err) {
    next(err);
  }
};

// POST /api/templates
exports.createTemplate = async (req, res, next) => {
  try {
    const { title, message, mediaUrl, mediaType } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message required' });
    }
    const template = await Template.create({ userId: req.user._id, title, message, mediaUrl, mediaType });
    res.status(201).json({ success: true, template });
  } catch (err) {
    next(err);
  }
};

// PUT /api/templates/:id
exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, template });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/templates/:id
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
};
