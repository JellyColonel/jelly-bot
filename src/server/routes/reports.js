const express = require('express');
const router = express.Router();
const ReportService = require('../services/reportService');
const logger = require('../../utils/logger');

router.post('/submit', async (req, res) => {
  try {
    logger.detailedInfo('Received form submission', req.body);

    const reportData = req.body;
    await ReportService.processReport(reportData);

    res.status(200).json({ message: 'Report submitted successfully' });
  } catch (error) {
    logger.detailedError('Failed to process submission', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    res.status(400).json({
      error: 'Failed to process submission',
      details: error.message,
    });
  }
});

module.exports = router;
