require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const apiRoutes = require('./src/routes');
const { UPLOAD_DIR } = require('./src/services/media.service');
const notFoundMiddleware = require('./src/middleware/not-found.middleware');
const errorMiddleware = require('./src/middleware/error.middleware');

const app = express();

// Global middleware
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use(cors());
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