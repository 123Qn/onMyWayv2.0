require('dotenv').config();

const express = require('express');
const cors = require('cors');

const apiRoutes = require('./src/routes');
const notFoundMiddleware = require('./src/middleware/not-found.middleware');
const errorMiddleware = require('./src/middleware/error.middleware');

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;