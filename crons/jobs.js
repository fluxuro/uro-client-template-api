const knex = require('../src/configs/knex/knex');
const moment = require('moment');
const { failJob } = require('../src/services/database/jobService');
const failStuckJobs = async () => {
  try {
    const stuckJobs = await knex('job')
      .whereIn('status', ['processing', 'pending'])
      //last 20 minutes
      .where('processing_at', '<', moment().subtract(20, 'minutes').toDate())
      .select('job_id', 'customer_id', 'cost_to_customer');
    console.log(`found ${stuckJobs.length || 0} stuck jobs`);
    stuckJobs.forEach(async (job) => {
      console.log(`failed stuck job ${job.job_id}`);
      await failJob({
        job_id: job.job_id,
        job_result: {
          error: 'Stuck job',
          message: 'Job processing time exceeded 20 minutes',
        },
      });
      //TODO: REFUND CUSTOMER HERE!
      // await refundCustomer({
      //   customerId: job.customer_id,
      //   amount: job.cost_to_customer,
      //   jobId: job.job_id,
      // });
    });
  } catch (error) {
    console.log(error);
  }
};

const jobCronFunctions = {
  failStuckJobs,
};

module.exports = jobCronFunctions;
