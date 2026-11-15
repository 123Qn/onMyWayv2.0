const express = require('express');
const router = express.Router();

const healthController = require('../controllers/health.controller');

// Health check
router.get('/health', healthController.checkHealth);
router.use('/auth', require('./auth.routes'));
module.exports = router;