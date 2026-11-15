const express = require('express');
const router = express.Router();

const healthController = require('../controllers/health.controller');

// Health check
router.get('/health', healthController.checkHealth);
router.use('/auth', require('./auth.routes'));
router.use('/posts', require('./post.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/', require('./tripRun.routes'));
router.use('/', require('./social.routes'));
module.exports = router;