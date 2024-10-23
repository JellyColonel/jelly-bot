const express = require('express');
const config = require('../config');
const logger = require('../utils/logger');
const reportsRouter = require('./routes/reports');

const app = express();

app.use(express.json());
app.use('/reports', reportsRouter);

app.listen(config.server.port, () => {
  logger.info(`Server running on port ${config.server.port}`);
});

module.exports = app;
