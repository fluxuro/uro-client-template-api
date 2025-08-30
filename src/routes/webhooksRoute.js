const webhookStore = require('../store/webhookStore');
const logger = require('../utils/logger');

const router = require('express').Router();

router.post('/model/:job_id', async (req, res) => {
  try {
    await webhookStore.handleModelWebhook(req);
  } catch (err) {
    logger.error('handleModelWebhook Error', {
      error: err.message,
      stack: err.stack,
      body: req.body,
    });
  } finally {
    res.json({ message: 'Webhook Route Model', body: req.body });
  }
});

router.post('/workflow/:job_id', async (req, res) => {
  try {
    await webhookStore.handleWorkflowWebhook(req);
  } catch (err) {
    logger.error('handleWorkflowWebhook Error', {
      error: err.message,
      stack: err.stack,
      body: req.body,
    });
  } finally {
    res.json({ message: 'Webhook Route Workflow', body: req.body });
  }
});

module.exports = router;
