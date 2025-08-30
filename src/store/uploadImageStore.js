const knex = require('../configs/knex/knex');
const logger = require('../utils/logger');
const uploadImageToDatabase = async (req) => {
  try {
    const { image_url } = req.body;
    const user_id = req.body.user_id || req.query.user_id;

    const image = await knex('user_image').insert({
      image_url,
      user_id,
    });
    return { image_id: image[0] };
  } catch (error) {
    logger.error('uploadImageToDatabase Error', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    throw error;
  }
};

const uploadImageStore = {
  uploadImageToDatabase,
};

module.exports = uploadImageStore;
