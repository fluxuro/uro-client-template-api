const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello from Uro API!' });
});

router.use('/webhooks', require('./webhooksRoute'));

router.use((req, res, next) => {
  if (
    !req.headers['api-key'] ||
    req.headers['api-key'] != process.env.API_KEY
  ) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    });
  }
  next();
});

router.use('/models', require('./modelsRoute'));
router.use('/jobs', require('./jobsRoute'));
router.use('/upload-image', require('./uploadImageRoute'));
module.exports = router;
