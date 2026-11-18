require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const apiRoutes = require('./src/routes');
const { UPLOAD_DIR } = require('./src/services/media.service');
const notFoundMiddleware = require('./src/middleware/not-found.middleware');
const errorMiddleware = require('./src/middleware/error.middleware');

const app = express();

// Global middleware
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use(cors());
// gzip JSON responses: the feed page shrinks ~5x, which is what a phone on mobile data waits for
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Uploaded photos (local storage in development)
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true }));

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;