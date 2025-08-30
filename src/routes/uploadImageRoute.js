const uploadImageStore = require('../store/uploadImageStore');

const router = require('express').Router();

router.post('/', async (req, res, next) => {
  try {
    const image = await uploadImageStore.uploadImageToDatabase(req);
    res.json(image);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
