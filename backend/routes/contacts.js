const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getContacts, createContact, updateContact, deleteContact, deleteContacts,
  getTags, importCSV, exportCSV,
} = require('../controllers/contactController');

router.use(protect);
router.get('/tags', getTags);
router.get('/export', exportCSV);
router.post('/import', upload.single('file'), importCSV);
router.get('/', getContacts);
router.post('/', createContact);
router.delete('/bulk', deleteContacts);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
