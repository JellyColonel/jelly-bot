const express = require('express');
const config = require('../config');
const reportsRouter = require('./routes/reports');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/reports', reportsRouter);

// Set port in app settings
app.set('port', config.server.port);

module.exports = app;
