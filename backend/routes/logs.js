const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getLogs } = require('../controllers/logController');

router.use(protect);
router.get('/', getLogs);

module.exports = router;
