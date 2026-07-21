const Contact = require('../models/Contact');
const Log = require('../models/Log');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { normalizePhone } = require('../services/whatsapp/SessionManager');


// GET /api/contacts
exports.getContacts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', tag = '' } = req.query;
    const query = { userId: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (tag) {
      query.tags = tag;
    }

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, contacts, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// POST /api/contacts
exports.createContact = async (req, res, next) => {
  try {
    const { name, phone, tags, notes } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });

    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone. Use international format with country code (e.g. 919876543210)',
      });
    }

    const contact = await Contact.create({
      userId: req.user._id,
      name,
      phone: normalized,
      tags,
      notes,
    });
    res.status(201).json({ success: true, contact });
  } catch (err) {
    next(err);
  }
};

// PUT /api/contacts/:id
exports.updateContact = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.phone) {
      const normalized = normalizePhone(updates.phone);
      if (!normalized || normalized.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone. Use international format with country code (e.g. 919876543210)',
        });
      }
      updates.phone = normalized;
    }

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, contact });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/contacts/:id
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/contacts/bulk
exports.deleteContacts = async (req, res, next) => {
  try {
    const { ids } = req.body;
    await Contact.deleteMany({ _id: { $in: ids }, userId: req.user._id });
    res.json({ success: true, message: `${ids.length} contacts deleted` });
  } catch (err) {
    next(err);
  }
};

// GET /api/contacts/tags
exports.getTags = async (req, res, next) => {
  try {
    const tags = await Contact.distinct('tags', { userId: req.user._id });
    res.json({ success: true, tags });
  } catch (err) {
    next(err);
  }
};

// POST /api/contacts/import
exports.importCSV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'CSV file required' });

    const results = [];
    const errors = [];
    let imported = 0;
    let skipped = 0;

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', async () => {
        for (const row of results) {
          const phone = row.phone || row.Phone || row.mobile || row.Mobile || row.number;
          const name = row.name || row.Name || '';
          const tags = (row.tags || row.Tags || '').split(',').map((t) => t.trim()).filter(Boolean);

          if (!phone) { skipped++; continue; }

          const normalized = normalizePhone(phone);
          if (!normalized || normalized.length < 8) { skipped++; continue; }

          try {
            await Contact.findOneAndUpdate(
              { userId: req.user._id, phone: normalized },
              { userId: req.user._id, name: name.trim(), phone: normalized, tags },
              { upsert: true, new: true }
            );
            imported++;
          } catch {
            skipped++;
          }

        }

        // Cleanup uploaded CSV
        fs.unlink(req.file.path, () => {});

        await Log.create({
          userId: req.user._id,
          event: 'CSV_IMPORTED',
          level: 'success',
          details: `Imported ${imported}, skipped ${skipped}`,
        });

        res.json({ success: true, imported, skipped });
      });
  } catch (err) {
    next(err);
  }
};

// GET /api/contacts/export
exports.exportCSV = async (req, res, next) => {
  try {
    const contacts = await Contact.find({ userId: req.user._id }).lean();
    const fields = ['name', 'phone', 'tags', 'notes', 'createdAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(contacts.map((c) => ({ ...c, tags: c.tags.join(',') })));

    res.header('Content-Type', 'text/csv');
    res.attachment('contacts.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
