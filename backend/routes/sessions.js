const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSessions, createSession, deleteSession, reconnectSession } = require('../controllers/sessionController');

router.use(protect);
router.get('/', getSessions);
router.post('/', createSession);
router.post('/:id/reconnect', reconnectSession);
router.delete('/:id', deleteSession);

module.exports = router;
