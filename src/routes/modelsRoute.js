const {
  handlePaginationAndParams,
} = require('../middleware/paginationMiddleware');
const UROClient = require('../services/uro');
const modelsStore = require('../store/modelsStore');

const router = require('express').Router();

router.get('/', handlePaginationAndParams, async (req, res, next) => {
  try {
    const models = await modelsStore.getModels(req);
    res.json(models);
  } catch (error) {
    next(error);
  }
});

router.get('/model/:id', async (req, res, next) => {
  try {
    const model = await modelsStore.getModel(req);
    res.json(model);
  } catch (error) {
    next(error);
  }
});

router.post('/run-model', async (req, res, next) => {
  try {
    const response = await modelsStore.runModel(req);
    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
