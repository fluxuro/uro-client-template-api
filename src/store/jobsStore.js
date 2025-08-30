const knex = require('../configs/knex/knex');
const {
  ValidationError,
  UnauthorizedError,
} = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { paginated } = require('../utils/responseFormatter');
const _ = require('lodash');
const getJobs = async (req) => {
  try {
    const { page, limit, offset } = req.pagination;
    const { status, job_ids, user_id, sortBy, sortOrder, language_id } =
      req.query;
    if (!user_id) {
      throw new Error('User ID is required');
    }
    const jobs = await knex('job')
      .select([
        'job.job_id',
        'job.provider_job_id',
        'job.provider_job_type',
        'job.user_id',
        'job.job_input_params',
        'job.job_result',
        'job.status',
        'job.processing_at',
        'job.created_at',
        'job.completed_at',
        'job.failed_at',
        'job.job_public',
        // 'cost_to_client',
        'job.cost_to_customer',
        'mt.model_name',
      ])
      .where('job.deleted', 0)
      .leftJoin('model_tr AS mt', function () {
        this.on('job.model_id', '=', 'mt.model_id').andOn(
          'mt.language_id',
          '=',
          knex.raw('?', [language_id || 'en'])
        );
      })
      .modify((queryBuilder) => {
        if (status) {
          queryBuilder.where({
            status,
          });
        }
        if (job_ids) {
          queryBuilder.whereIn('job.job_id', job_ids);
        }
        if (user_id) {
          queryBuilder.where({
            'job.user_id': user_id,
          });
        }
      })
      .modify((queryBuilder) => {
        if (sortBy) {
          queryBuilder.orderBy(sortBy, sortOrder || 'desc');
        }
      })
      .offset(offset)
      .limit(limit);

    const { count } = await knex('job')
      .where('job.deleted', 0)
      .modify((queryBuilder) => {
        if (status) {
          queryBuilder.where({
            status,
          });
        }
        if (job_ids) {
          queryBuilder.whereIn('job.job_id', job_ids);
        }
        if (user_id) {
          queryBuilder.where({
            'job.user_id': user_id,
          });
        }
      })
      .count('* as count')
      .first();

    const data = await Promise.all(
      jobs.map(async (job) => {
        let item = job;
        try {
          item.job_input_params = JSON.parse(job.job_input_params);
        } catch (error) {}
        try {
          item.job_result = JSON.parse(job.job_result);
        } catch (error) {}
        return item;
      })
    );
    return paginated(data, page, limit, count);
  } catch (error) {
    logger.error('getJobs Error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getJobById = async (req) => {
  try {
    const user_id = req.query.user_id || null;
    const job_id = req.query.job_id || req.params.job_id || null;
    const language_id = req.query.language_id || 'en';
    if (!user_id || !job_id) {
      throw new Error('User ID and Job ID are required');
    }
    const job = await knex('job')
      .select([
        'job.job_id',
        'job.model_id',
        'job.provider_job_id',
        'job.provider_job_type',
        'job.user_id',
        'job.job_input_params',
        'job.job_result',
        'job.status',
        'job.processing_at',
        'job.created_at',
        'job.completed_at',
        'job.failed_at',
        'job.job_public',
        // 'cost_to_client',
        'job.cost_to_customer',
        'mt.model_name',
        'm.model_eta',
      ])
      .leftJoin('model_tr AS mt', function () {
        this.on('job.model_id', '=', 'mt.model_id').andOn(
          'mt.language_id',
          '=',
          knex.raw('?', [language_id])
        );
      })
      .leftJoin('model AS m', function () {
        this.on('job.model_id', '=', 'm.model_id');
      })
      .where({
        'job.user_id': user_id,
        'job.job_id': job_id,
        'job.deleted': 0,
      })
      .first();

    if (!job) {
      throw new Error('Job not found');
    }
    try {
      job.job_input_params = JSON.parse(job.job_input_params);
    } catch (error) {}
    try {
      job.job_result = JSON.parse(job.job_result);
    } catch (error) {}

    return job;
  } catch (error) {
    logger.error('getJobById Error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const deleteJob = async (req) => {
  try {
    const user_id = req.body.user_id || null;
    const job_id = req.body.job_id || null;
    if (!user_id || !job_id) {
      throw new ValidationError('User ID and Job ID are required');
    }
    const job = await knex('job')
      .where({
        user_id,
        job_id,
        deleted: 0,
      })
      .update({
        deleted: 1,
      });
    return job;
  } catch (error) {
    logger.error('deleteJob Error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const updateJobPublic = async (req) => {
  try {
    const user_id = req.query.user_id || null;

    const job_id = req.body.job_id || null;
    const job_public = req.body.job_public || null;
    if (!user_id || !job_id) {
      throw new ValidationError('User ID and Job ID are required');
    }
    const job = await knex('job')
      .select([
        'job_id',
        'provider_job_id',
        'provider_job_type',
        'user_id',
        'job_input_params',
        'job_result',
        'status',
        'processing_at',
        'created_at',
        'completed_at',
        'failed_at',
        'job_public',
        // 'cost_to_client',
        'cost_to_customer',
      ])
      .where({
        user_id,
        job_id,
        deleted: 0,
      })
      .first();
    if (!job) {
      throw new ValidationError('Job not found');
    }
    try {
      job.job_result = JSON.parse(job.job_result);
    } catch (error) {}

    if (
      (
        job?.job_result?.[0]?.content ||
        job?.job_result?.[0]?.external_url ||
        ''
      ).includes('182bc42f-ef09-42ef-8649-9acc28a00393') == true &&
      job_public
    ) {
      throw new ValidationError('Job is NSFW');
    }

    if (job.status != 'completed') {
      throw new ValidationError('Job is not completed');
    }
    const updated = await knex('job')
      .where({
        user_id,
        job_id,
        deleted: 0,
      })
      .update({
        job_public: job_public ? 1 : 0,
      });
    return updated;
  } catch (error) {
    logger.error('updateJobPublic Error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const getImagesFromJobs = async (req) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      throw new Error('User ID is required');
    }
    const jobs = await knex('job')
      .select(['job_id', 'user_id', 'job_result', 'status', 'completed_at'])
      .where({
        user_id,
        deleted: 0,
        status: 'completed',
      })
      .orderBy('created_at', 'desc')
      .offset(req.pagination.offset)
      .limit(req.pagination.limit);
    const { count } = await knex('job')
      .where({
        user_id,
        deleted: 0,
        status: 'completed',
      })
      .count('* as count')
      .first();

    const imagesArray = [];
    jobs.forEach((job) => {
      let jobImages = [];
      try {
        const jobResult = JSON.parse(job.job_result);
        jobResult.forEach((item) => {
          if (item?.content_type === 'image') {
            jobImages.push(item.content || item.external_url || null);
          }
        });
      } catch (error) {}
      if (jobImages.length > 0) {
        imagesArray.push(...jobImages);
      }
    });

    return paginated(
      imagesArray,
      req.pagination.page,
      req.pagination.limit,
      count
    );
  } catch (error) {
    logger.error('getImagesFromJobs Error', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const jobsStore = {
  getJobs,
  getJobById,
  deleteJob,
  updateJobPublic,
  getImagesFromJobs,
};

module.exports = jobsStore;
