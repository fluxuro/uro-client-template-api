const moment = require('moment');
const knex = require('../../configs/knex/knex');

const createJob = async ({
  provider_job_id,
  provider_job_type,
  user_id,
  job_input_params,
  //   job_result,
  //   status,
  //   processing_at,
  //   completed_at,
  //   failed_at,
  cost_to_client,
  cost_to_customer,
  model_id,
  customer_id,
}) => {
  try {
    const [job_id] = await knex('job').insert({
      provider_job_id,
      provider_job_type,
      user_id,
      job_input_params:
        typeof job_input_params === 'object'
          ? JSON.stringify(job_input_params)
          : job_input_params,
      status: 'pending',
      //   processing_at,
      //   completed_at,
      //   failed_at,
      created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      cost_to_client,
      cost_to_customer,
      model_id,
      customer_id,
    });
    return job_id;
  } catch (error) {
    throw error;
  }
};

const processJob = async ({ job_id, provider_job_id }) => {
  try {
    const job = await knex('job')
      .where({
        job_id,
      })
      .select('*')
      .first();
    if (!job) {
      throw new Error('Job not found');
    }

    await knex('job')
      .where({ job_id })
      .update({
        provider_job_id,
        status: 'processing',
        processing_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      });
    return job;
  } catch (error) {
    throw error;
  }
};

const completeJob = async ({ job_id, job_result, cost_to_client }) => {
  try {
    const job = await knex('job')
      .where({
        job_id,
      })
      .select('*')
      .first();
    if (!job) {
      throw new Error('Job not found');
    }

    await knex('job')
      .where({ job_id })
      .update({
        job_result:
          typeof job_result === 'object'
            ? JSON.stringify(job_result)
            : job_result,
        status: 'completed',
        completed_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        cost_to_client,
      });
    return job;
  } catch (error) {
    throw error;
  }
};

const failJob = async ({ job_id, job_result }) => {
  try {
    const job = await knex('job')
      .where({
        job_id,
      })
      .select('*')
      .first();
    if (!job) {
      throw new Error('Job not found');
    }

    await knex('job')
      .where({ job_id })
      .update({
        job_result:
          typeof job_result === 'object'
            ? JSON.stringify(job_result)
            : job_result,
        status: 'failed',
        failed_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      });
    return job;
  } catch (error) {
    throw error;
  }
};

const jobService = {
  createJob,
  processJob,
  completeJob,
  failJob,
};

module.exports = jobService;
